-- SH GAMING STORE — 06-supplier.sql
-- Supplier (Drip) API fulfilment. Run AFTER 01..05. Safe to re-run.
--
-- WHY THIS EXISTS
-- Keys now come from the supplier's API at purchase time instead of from the
-- license_keys vault. An HTTP call cannot live inside a Postgres function:
-- if the supplier hangs, the transaction holds a row lock on profiles and
-- blocks the buyer's wallet. So checkout is split into three short
-- transactions the app calls in order:
--
--   1. reserve_order   debit wallet, create order as 'paid' (no key yet)
--   2. settle_order    attach the delivered key, mark 'delivered'
--   3. refund_order    give the money back, mark 'cancelled'
--
-- Between 1 and 2 the money is already gone from the wallet. That is
-- deliberate: it makes double-spend impossible. If the API then fails, step 3
-- returns it and the ledger shows both movements.

-- ============================================================
-- SCHEMA
-- ============================================================

-- The supplier SKU lives on the variant, not the product: their catalogue is
-- keyed per duration (e.g. SANDBOX-DEMO-30D). Sending a product-level code
-- returns 400 DURATION_REQUIRED.
alter table public.product_variants
  add column if not exists supplier_sku text;

create index if not exists pv_supplier_sku_idx
  on public.product_variants (supplier_sku)
  where supplier_sku is not null;

-- Products fulfilled by the supplier skip the license_keys vault entirely.
alter table public.products
  add column if not exists fulfilment text not null default 'supplier'
  check (fulfilment in ('supplier', 'vault'));

-- Audit trail of every supplier call. Kept separate from orders so a failed
-- call is still recorded even when the order is rolled back.
create table if not exists public.supplier_orders (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid references public.orders(id) on delete set null,
  user_id       uuid references public.profiles(id) on delete set null,
  sku           text not null,
  quantity      int not null default 1,
  -- Reusing the same idempotency key on retry makes the supplier return the
  -- original order instead of charging the deposit twice.
  idempotency_key text not null unique,
  status        text not null default 'pending'
                check (status in ('pending','fulfilled','failed','refunded')),
  supplier_ref  text,
  error_code    text,
  -- Supplier charges in USD microcents (1 USD = 100,000,000). Stored raw as
  -- bigint; never divide by 100.
  cost_microcents bigint,
  raw_response  jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists so_order_idx on public.supplier_orders (order_id);
create index if not exists so_status_idx on public.supplier_orders (status, created_at desc);

alter table public.supplier_orders enable row level security;

-- Buyers may read their own supplier attempts; only admins see everything.
drop policy if exists so_read on public.supplier_orders;
create policy so_read on public.supplier_orders for select
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists so_admin_write on public.supplier_orders;
create policy so_admin_write on public.supplier_orders for all
  using (public.is_admin()) with check (public.is_admin());

-- order_items.delivered_key already exists; supplier keys land in the same
-- column so the buyer's vault page needs no changes.

-- ============================================================
-- STEP 1 — RESERVE
-- Debits the wallet and creates a 'paid' order with no key yet.
-- ============================================================
create or replace function public.reserve_order(
  p_variant_id uuid,
  p_qty        int default 1,
  p_note       text default null
)
returns public.orders
language plpgsql security definer set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_order public.orders;
  v_prod  public.products;
  v_var   public.product_variants;
  v_qty   int;
  v_total numeric(12,2);
  v_bal   numeric(12,2);
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  v_qty := greatest(1, least(50, coalesce(p_qty, 1)));

  select * into v_var from public.product_variants
    where id = p_variant_id and active = true;
  if v_var.id is null then raise exception 'VARIANT_UNAVAILABLE'; end if;

  select * into v_prod from public.products
    where id = v_var.product_id and active = true;
  if v_prod.id is null then raise exception 'PRODUCT_UNAVAILABLE'; end if;

  if v_prod.fulfilment = 'supplier' and coalesce(v_var.supplier_sku,'') = '' then
    raise exception 'NO_SUPPLIER_SKU';
  end if;

  -- Price always comes from the database, never from the client.
  v_total := v_var.price * v_qty;

  -- Trusted debit path: allow this transaction to write profiles.wallet.
  perform set_config('app.bypass_profile_guard', 'on', true);

  -- FOR UPDATE serialises concurrent checkouts by the same user, so two
  -- parallel requests cannot both pass the balance check.
  select wallet into v_bal from public.profiles where id = v_uid for update;
  if v_bal is null then raise exception 'NO_PROFILE'; end if;
  if v_bal < v_total then raise exception 'INSUFFICIENT_FUNDS'; end if;

  insert into public.orders (user_id, status, total, pay_method, note)
  values (v_uid, 'paid', v_total, 'wallet', p_note)
  returning * into v_order;

  insert into public.order_items
    (order_id, product_id, variant_id, product_name, variant_label, unit_price, qty)
  values
    (v_order.id, v_prod.id, v_var.id, v_prod.name, v_var.label, v_var.price, v_qty);

  update public.profiles set wallet = wallet - v_total where id = v_uid;
  insert into public.wallet_txns (user_id, amount, kind, ref_id, note)
    values (v_uid, -v_total, 'purchase', v_order.id, 'Order ' || v_order.order_no);

  return v_order;
end;
$$;

revoke all on function public.reserve_order(uuid,int,text) from public;
grant execute on function public.reserve_order(uuid,int,text) to authenticated;

-- ============================================================
-- STEP 2 — SETTLE
-- Attaches the delivered key(s) and marks the order delivered.
-- ============================================================
create or replace function public.settle_order(
  p_order_id uuid,
  p_keys     text[],
  p_ref      text default null
)
returns public.orders
language plpgsql security definer set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_order public.orders;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into v_order from public.orders
    where id = p_order_id for update;
  if v_order.id is null then raise exception 'NOT_FOUND'; end if;

  -- A buyer may only settle their own order. Admins may settle any.
  if v_order.user_id <> v_uid and not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;

  -- Idempotent: a retry after a successful settle is a no-op, not an error.
  if v_order.status = 'delivered' then return v_order; end if;
  if v_order.status <> 'paid' then raise exception 'BAD_STATE'; end if;
  if p_keys is null or array_length(p_keys, 1) is null then
    raise exception 'NO_KEYS';
  end if;

  update public.order_items
    set delivered_key = array_to_string(p_keys, E'\n')
    where order_id = p_order_id;

  update public.orders
    set status = 'delivered',
        delivered_at = now(),
        pay_ref = coalesce(p_ref, pay_ref)
    where id = p_order_id
    returning * into v_order;

  return v_order;
end;
$$;

revoke all on function public.settle_order(uuid,text[],text) from public;
grant execute on function public.settle_order(uuid,text[],text) to authenticated;

-- ============================================================
-- STEP 3 — REFUND
-- Returns the money when the supplier could not deliver.
-- ============================================================
create or replace function public.refund_order(
  p_order_id uuid,
  p_reason   text default null
)
returns public.orders
language plpgsql security definer set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_order public.orders;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into v_order from public.orders
    where id = p_order_id for update;
  if v_order.id is null then raise exception 'NOT_FOUND'; end if;

  if v_order.user_id <> v_uid and not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;

  -- Idempotent, and refusing to refund a delivered order is the important
  -- guard here: otherwise a buyer could keep the key and get the money back.
  if v_order.status in ('cancelled','refunded') then return v_order; end if;
  if v_order.status <> 'paid' then raise exception 'BAD_STATE'; end if;

  perform set_config('app.bypass_profile_guard', 'on', true);

  update public.profiles set wallet = wallet + v_order.total
    where id = v_order.user_id;

  insert into public.wallet_txns (user_id, amount, kind, ref_id, note)
    values (v_order.user_id, v_order.total, 'refund', v_order.id,
            coalesce(p_reason, 'Supplier could not deliver'));

  update public.orders
    set status = 'cancelled', note = coalesce(p_reason, note)
    where id = p_order_id
    returning * into v_order;

  return v_order;
end;
$$;

revoke all on function public.refund_order(uuid,text) from public;
grant execute on function public.refund_order(uuid,text) to authenticated;

-- ============================================================
-- AUDIT LOG WRITER
-- The RLS policy above lets buyers READ their own supplier attempts but not
-- write them, so a normal checkout could not record its own audit row. This
-- definer function is the only write path: it pins user_id to auth.uid() so a
-- buyer cannot forge a row against someone else's account.
-- ============================================================
create or replace function public.log_supplier_order(
  p_order_id  uuid,
  p_sku       text,
  p_quantity  int,
  p_idem_key  text,
  p_status    text,
  p_ref       text default null,
  p_error     text default null,
  p_cost      bigint default null
)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;

  if p_status not in ('pending','fulfilled','failed','refunded') then
    raise exception 'BAD_STATUS';
  end if;

  -- The order must belong to the caller, or the caller must be an admin.
  if not exists (
    select 1 from public.orders o
     where o.id = p_order_id
       and (o.user_id = v_uid or public.is_admin())
  ) then
    raise exception 'FORBIDDEN';
  end if;

  -- Upsert on the idempotency key so a retry updates the original attempt
  -- instead of raising a unique violation and masking the real error.
  insert into public.supplier_orders
    (order_id, user_id, sku, quantity, idempotency_key, status,
     supplier_ref, error_code, cost_microcents)
  values
    (p_order_id, v_uid, p_sku, coalesce(p_quantity, 1), p_idem_key, p_status,
     p_ref, p_error, p_cost)
  on conflict (idempotency_key) do update
    set status          = excluded.status,
        supplier_ref    = coalesce(excluded.supplier_ref, supplier_orders.supplier_ref),
        error_code      = coalesce(excluded.error_code, supplier_orders.error_code),
        cost_microcents = coalesce(excluded.cost_microcents, supplier_orders.cost_microcents),
        updated_at      = now();
end;
$$;

revoke all on function public.log_supplier_order(uuid,text,int,text,text,text,text,bigint) from public;
grant execute on function public.log_supplier_order(uuid,text,int,text,text,text,text,bigint) to authenticated;

-- ============================================================
-- Settings row for supplier config (API key stays in Vercel env, never here).
-- ============================================================
insert into public.settings (key, value) values
  ('supplier', '{"name":"Drip","base_url":"https://dripclientofficial.dev","enabled":true}'::jsonb)
on conflict (key) do nothing;
