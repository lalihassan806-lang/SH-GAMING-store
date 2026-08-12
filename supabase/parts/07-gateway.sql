-- SH GAMING STORE — 07-gateway.sql
-- Automatic wallet top-ups through a crypto gateway (Binance Pay).
-- Run AFTER 01..06. Safe to re-run.
--
-- WHY THIS EXISTS
-- The manual flow (topups + approve_topup) needs a human to match a bank
-- reference before the wallet moves. A gateway tells us the money arrived, so
-- the credit can happen with no admin in the loop.
--
-- THE ONE RULE THAT MATTERS
-- Nothing here may ever be callable by a customer's session. A buyer who can
-- reach the credit path can mint their own balance and drain the supplier
-- deposit. So the credit function is granted to service_role ONLY, and the
-- webhook route that calls it verifies Binance's RSA signature first.
--
-- FLOW
--   1. start_gateway_payment    row created as 'created' (no money yet)
--   2. attach_gateway_payment   store what the gateway handed back
--   3. credit_gateway_payment   money confirmed: wallet + ledger + topup row
--      or close_gateway_payment payment expired / failed

-- ============================================================
-- SCHEMA
-- ============================================================
create table if not exists public.gateway_payments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  provider     text not null default 'binance_pay'
               check (provider in ('binance_pay')),

  -- The gateway's idempotency handle. Unique so the same payment can never
  -- produce two rows, which is what makes repeated webhooks harmless.
  -- Binance allows letters and digits only, 32 characters maximum.
  trade_no     text not null unique,

  -- What we credit on success, in the store's own currency. Held here rather
  -- than read back from the webhook: the webhook reports the CRYPTO amount,
  -- and converting it back would re-introduce an exchange rate we do not want
  -- to be responsible for.
  amount       numeric(12,2) not null check (amount > 0),
  currency     text not null default 'PKR',

  -- What the buyer actually sends, as quoted by the gateway (e.g. 3.58 USDT).
  -- Display and reconciliation only.
  pay_currency text,
  pay_amount   numeric(20,8),

  prepay_id    text,
  checkout_url text,

  -- 'mismatch' is a dead end for review: the gateway confirmed a payment
  -- smaller than the quote, so we deliberately did not credit.
  status       text not null default 'created'
               check (status in ('created','paid','credited','closed','failed','mismatch')),

  transaction_id text,
  paid_amount    numeric(20,8),

  -- The topups row written on success, so an auto credit shows up in the same
  -- history and admin screens as a manual one.
  topup_id     uuid references public.topups(id) on delete set null,

  raw          jsonb,
  -- Last time we asked the gateway about this payment. Throttles the status
  -- fallback: without it a buyer could poll in a loop and burn the merchant
  -- account's API rate limit, which would break payments for every customer.
  checked_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Added separately so re-running this file over an existing install picks it up.
alter table public.gateway_payments
  add column if not exists checked_at timestamptz;

create index if not exists gp_user_idx on public.gateway_payments (user_id, created_at desc);
create index if not exists gp_status_idx on public.gateway_payments (status, created_at desc);

alter table public.gateway_payments enable row level security;

-- Read-only for buyers, and only their own rows. There is deliberately no
-- insert or update policy for anyone but an admin: every write goes through
-- the definer functions below.
drop policy if exists gp_read on public.gateway_payments;
create policy gp_read on public.gateway_payments for select
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists gp_admin_write on public.gateway_payments;
create policy gp_admin_write on public.gateway_payments for all
  using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- STEP 1 — START
-- Records the intent to pay. No money has moved; this row exists so the
-- webhook has something to match against later.
-- ============================================================
create or replace function public.start_gateway_payment(
  p_trade_no text,
  p_amount   numeric,
  p_provider text default 'binance_pay'
)
returns public.gateway_payments
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.gateway_payments;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  -- Same ceiling as the manual top-up form, so the two paths cannot be used
  -- to bypass each other's limits.
  if p_amount is null or p_amount <= 0 or p_amount > 1000000 then
    raise exception 'BAD_AMOUNT';
  end if;

  -- Letters and digits only: the gateway rejects anything else, and rejecting
  -- it here keeps a malformed value out of the unique index.
  if p_trade_no is null or p_trade_no !~ '^[A-Za-z0-9]{8,32}$' then
    raise exception 'BAD_TRADE_NO';
  end if;

  insert into public.gateway_payments (user_id, provider, trade_no, amount)
  values (v_uid, coalesce(p_provider, 'binance_pay'), p_trade_no, p_amount)
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.start_gateway_payment(text,numeric,text) from public;
grant execute on function public.start_gateway_payment(text,numeric,text) to authenticated;

-- ============================================================
-- STEP 2 — ATTACH
-- Stores the checkout link and the quoted crypto amount.
-- ============================================================
create or replace function public.attach_gateway_payment(
  p_trade_no     text,
  p_prepay_id    text,
  p_checkout_url text,
  p_pay_currency text default null,
  p_pay_amount   numeric default null
)
returns public.gateway_payments
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.gateway_payments;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into v_row from public.gateway_payments
    where trade_no = p_trade_no for update;
  if v_row.id is null then raise exception 'NOT_FOUND'; end if;

  if v_row.user_id <> v_uid and not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;

  -- Only a fresh row may be filled in. Without this an already-credited
  -- payment could be pointed at a new checkout link and replayed.
  if v_row.status <> 'created' then raise exception 'BAD_STATE'; end if;

  update public.gateway_payments
    set prepay_id    = p_prepay_id,
        checkout_url = p_checkout_url,
        pay_currency = p_pay_currency,
        pay_amount   = p_pay_amount,
        updated_at   = now()
    where id = v_row.id
    returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.attach_gateway_payment(text,text,text,text,numeric) from public;
grant execute on function public.attach_gateway_payment(text,text,text,text,numeric) to authenticated;

-- ============================================================
-- POLL THROTTLE
-- Returns true at most once every few seconds per payment. The browser polls
-- while it waits for confirmation, and each poll that gets through costs one
-- call against the merchant account's rate limit — shared by every customer.
-- Enforced in the database rather than in the route because a rate limit held
-- in server memory is per-instance, and serverless runs many instances.
-- ============================================================
create or replace function public.claim_gateway_check(p_trade_no text)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ok  boolean;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  update public.gateway_payments
    set checked_at = now()
    where trade_no = p_trade_no
      and user_id = v_uid
      and status in ('created','paid')
      -- Just under the client's 3s poll interval, so a well-behaved buyer is
      -- never throttled while a scripted flood still is.
      and (checked_at is null or checked_at < now() - interval '2 seconds')
    returning true into v_ok;

  return coalesce(v_ok, false);
end;
$$;

revoke all on function public.claim_gateway_check(text) from public;
grant execute on function public.claim_gateway_check(text) to authenticated;

-- ============================================================
-- STEP 3 — CREDIT
-- The money is confirmed. Credits the wallet, writes the ledger and leaves a
-- topups row so the payment appears everywhere a manual top-up does.
--
-- Returns the amount credited, or 0 when this call was a duplicate. Callers
-- must treat 0 as success — the gateway retries the same notification up to
-- six times and every retry after the first lands here.
--
-- NOT granted to authenticated. Only the service-role key may execute it.
-- ============================================================
create or replace function public.credit_gateway_payment(
  p_trade_no       text,
  p_transaction_id text default null,
  p_paid_amount    numeric default null,
  p_raw            jsonb default null
)
returns numeric
language plpgsql security definer set search_path = public
as $$
declare
  v_row   public.gateway_payments;
  v_topup public.topups;
begin
  -- FOR UPDATE is what makes the six retries safe: concurrent notifications
  -- queue here, and the second one sees status='credited' and stops.
  select * into v_row from public.gateway_payments
    where trade_no = p_trade_no for update;

  -- An unknown reference will never become known, so raising here would only
  -- make the gateway retry forever. Report it as a no-op instead.
  if v_row.id is null then return -1; end if;

  if v_row.status = 'credited' then return 0; end if;
  if v_row.status in ('closed','failed','mismatch') then return 0; end if;

  -- Defence in depth. A verified notification comes from the gateway and
  -- should always match the quote, so if it does not, something is wrong
  -- enough that crediting would be the wrong reflex.
  if p_paid_amount is not null
     and v_row.pay_amount is not null
     and p_paid_amount < v_row.pay_amount * 0.99 then
    update public.gateway_payments
      set status = 'mismatch', paid_amount = p_paid_amount,
          transaction_id = p_transaction_id, raw = p_raw, updated_at = now()
      where id = v_row.id;
    return 0;
  end if;

  -- Trusted credit path: allow this transaction to write profiles.wallet.
  perform set_config('app.bypass_profile_guard', 'on', true);

  insert into public.topups
    (user_id, amount, method, sender_name, tx_ref, status, admin_note, reviewed_at)
  values
    (v_row.user_id, v_row.amount, 'Binance Pay', 'Binance Pay',
     coalesce(p_transaction_id, v_row.trade_no), 'approved',
     'Credited automatically by the payment gateway', now())
  returning * into v_topup;

  update public.profiles set wallet = wallet + v_row.amount
    where id = v_row.user_id;

  insert into public.wallet_txns (user_id, amount, kind, ref_id, note)
    values (v_row.user_id, v_row.amount, 'topup', v_topup.id,
            'Binance Pay top-up');

  update public.gateway_payments
    set status = 'credited',
        transaction_id = coalesce(p_transaction_id, transaction_id),
        paid_amount = coalesce(p_paid_amount, paid_amount),
        topup_id = v_topup.id,
        raw = coalesce(p_raw, raw),
        updated_at = now()
    where id = v_row.id;

  return v_row.amount;
end;
$$;

-- Locked down hard: this function creates money out of nothing.
revoke all on function public.credit_gateway_payment(text,text,numeric,jsonb) from public;
revoke all on function public.credit_gateway_payment(text,text,numeric,jsonb) from anon;
revoke all on function public.credit_gateway_payment(text,text,numeric,jsonb) from authenticated;
grant execute on function public.credit_gateway_payment(text,text,numeric,jsonb) to service_role;

-- ============================================================
-- CLOSE
-- The payment expired or failed. Never touches the wallet, and refuses to
-- overwrite a credited payment.
-- ============================================================
create or replace function public.close_gateway_payment(
  p_trade_no text,
  p_status   text default 'closed',
  p_raw      jsonb default null
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if p_status not in ('closed','failed') then raise exception 'BAD_STATUS'; end if;

  update public.gateway_payments
    set status = p_status, raw = coalesce(p_raw, raw), updated_at = now()
    where trade_no = p_trade_no
      and status in ('created','paid');
end;
$$;

revoke all on function public.close_gateway_payment(text,text,jsonb) from public;
revoke all on function public.close_gateway_payment(text,text,jsonb) from anon;
revoke all on function public.close_gateway_payment(text,text,jsonb) from authenticated;
grant execute on function public.close_gateway_payment(text,text,jsonb) to service_role;

-- ============================================================
-- Settings row. Credentials live in Vercel env vars, never in the database.
-- ============================================================
insert into public.settings (key, value) values
  ('gateway', '{"provider":"binance_pay","label":"Binance Pay","enabled":true}'::jsonb)
on conflict (key) do nothing;
