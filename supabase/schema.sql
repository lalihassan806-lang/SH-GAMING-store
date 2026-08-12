-- ============================================================
-- SH GAMING STORE — Supabase schema
-- Run this in Supabase Dashboard > SQL Editor
-- Safe to re-run (idempotent).
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- PROFILES (mirrors auth.users, holds role + wallet)
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text,
  username     text,
  phone        text,
  role         text not null default 'user' check (role in ('user','admin')),
  wallet       numeric(12,2) not null default 0 check (wallet >= 0),
  banned       boolean not null default false,
  created_at   timestamptz not null default now()
);

-- ------------------------------------------------------------
-- CATEGORIES
-- ------------------------------------------------------------
create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  sort       int not null default 0,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- PRODUCTS
-- ------------------------------------------------------------
create table if not exists public.products (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  slug         text not null unique,
  tag          text,                       -- e.g. "FREE FIRE APKMOD"
  description  text,
  price        numeric(12,2) not null default 0 check (price >= 0),
  old_price    numeric(12,2),
  currency     text not null default 'PKR',
  gradient     text not null default 'orange',
  image_url    text,
  category_id  uuid references public.categories(id) on delete set null,
  active       boolean not null default true,
  featured     boolean not null default false,
  sort         int not null default 0,
  created_at   timestamptz not null default now()
);

-- Duration/variant options (1 Day / 7 Days / 30 Days)
create table if not exists public.product_variants (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  label      text not null,
  price      numeric(12,2) not null check (price >= 0),
  duration_days int,
  active     boolean not null default true,
  sort       int not null default 0
);

-- ------------------------------------------------------------
-- LICENSE KEYS (vault inventory)
-- ------------------------------------------------------------
create table if not exists public.license_keys (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  variant_id  uuid references public.product_variants(id) on delete set null,
  key_value   text not null,
  status      text not null default 'available' check (status in ('available','sold','reserved','disabled')),
  order_id    uuid,
  sold_to     uuid references public.profiles(id) on delete set null,
  sold_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists license_keys_lookup on public.license_keys (product_id, status);

-- ------------------------------------------------------------
-- PAYMENT METHODS (JazzCash / Easypaisa / Binance / Bank / USDT)
-- ------------------------------------------------------------
create table if not exists public.payment_methods (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  account_name text,
  account_no   text,
  instructions text,
  icon         text,
  active       boolean not null default true,
  sort         int not null default 0,
  created_at   timestamptz not null default now()
);

-- ------------------------------------------------------------
-- ORDERS
-- ------------------------------------------------------------
create table if not exists public.orders (
  id            uuid primary key default gen_random_uuid(),
  order_no      text not null unique default ('SH-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  user_id       uuid references public.profiles(id) on delete set null,
  status        text not null default 'pending' check (status in ('pending','paid','delivered','cancelled','refunded')),
  total         numeric(12,2) not null default 0,
  currency      text not null default 'PKR',
  pay_method    text,
  pay_ref       text,
  note          text,
  created_at    timestamptz not null default now(),
  delivered_at  timestamptz
);
create index if not exists orders_user_idx on public.orders (user_id, created_at desc);

create table if not exists public.order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders(id) on delete cascade,
  product_id   uuid references public.products(id) on delete set null,
  variant_id   uuid references public.product_variants(id) on delete set null,
  product_name text not null,
  variant_label text,
  unit_price   numeric(12,2) not null default 0,
  qty          int not null default 1 check (qty > 0),
  delivered_key text
);

-- ------------------------------------------------------------
-- WALLET TOP-UP REQUESTS (admin approves)
-- ------------------------------------------------------------
create table if not exists public.topups (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  amount      numeric(12,2) not null check (amount > 0),
  method      text,
  sender_name text,
  tx_ref      text,
  proof_url   text,
  status      text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_note  text,
  created_at  timestamptz not null default now(),
  reviewed_at timestamptz
);

-- Wallet ledger (audit trail for every balance change)
create table if not exists public.wallet_txns (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  amount     numeric(12,2) not null,       -- positive = credit, negative = debit
  kind       text not null check (kind in ('topup','purchase','refund','adjust')),
  ref_id     uuid,
  note       text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- SITE SETTINGS + FAQ + COUPONS
-- ------------------------------------------------------------
create table if not exists public.settings (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.faqs (
  id       uuid primary key default gen_random_uuid(),
  question text not null,
  answer   text not null,
  sort     int not null default 0,
  active   boolean not null default true
);

create table if not exists public.coupons (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  percent_off int check (percent_off between 1 and 100),
  flat_off    numeric(12,2),
  max_uses    int,
  used_count  int not null default 0,
  expires_at  timestamptz,
  active      boolean not null default true
);

-- ============================================================
-- HELPERS
-- ============================================================
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ------------------------------------------------------------
-- PROFILE COLUMN GUARD
-- RLS gates *which row* you may update but not *which column*. Without this
-- guard any signed-in user could PATCH their own profiles row over the REST
-- API and set role='admin' or wallet=999999. This trigger reverts privileged
-- columns for non-admin callers.
--
-- Trusted server-side functions that legitimately move money
-- (checkout_with_wallet, approve_topup) set app.bypass_profile_guard for
-- the duration of their transaction.
-- ------------------------------------------------------------
create or replace function public.guard_profile_columns()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  -- Trusted function opted out for this transaction.
  if coalesce(current_setting('app.bypass_profile_guard', true), 'off') = 'on' then
    return new;
  end if;

  -- No JWT = service-role key or SQL editor; RLS already limits reachable rows.
  if auth.uid() is null then
    return new;
  end if;

  -- Admins may edit anything.
  if public.is_admin() then
    return new;
  end if;

  -- Everyone else: privileged columns are immutable.
  new.id         := old.id;
  new.email      := old.email;
  new.role       := old.role;
  new.wallet     := old.wallet;
  new.banned     := old.banned;
  new.created_at := old.created_at;
  return new;
end;
$$;

drop trigger if exists profiles_guard_columns on public.profiles;
create trigger profiles_guard_columns
  before update on public.profiles
  for each row execute function public.guard_profile_columns();

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, username)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles         enable row level security;
alter table public.categories       enable row level security;
alter table public.products         enable row level security;
alter table public.product_variants enable row level security;
alter table public.license_keys     enable row level security;
alter table public.payment_methods  enable row level security;
alter table public.orders           enable row level security;
alter table public.order_items      enable row level security;
alter table public.topups           enable row level security;
alter table public.wallet_txns      enable row level security;
alter table public.settings         enable row level security;
alter table public.faqs             enable row level security;
alter table public.coupons          enable row level security;

-- PROFILES
drop policy if exists p_self_read on public.profiles;
create policy p_self_read on public.profiles for select using (id = auth.uid() or public.is_admin());
drop policy if exists p_self_update on public.profiles;
create policy p_self_update on public.profiles for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- PUBLIC CATALOG: anyone can read active rows
drop policy if exists c_read on public.categories;
create policy c_read on public.categories for select using (true);
drop policy if exists pr_read on public.products;
create policy pr_read on public.products for select using (active or public.is_admin());
drop policy if exists pv_read on public.product_variants;
create policy pv_read on public.product_variants for select using (active or public.is_admin());
drop policy if exists pm_read on public.payment_methods;
create policy pm_read on public.payment_methods for select using (active or public.is_admin());
drop policy if exists faq_read on public.faqs;
create policy faq_read on public.faqs for select using (active or public.is_admin());
drop policy if exists set_read on public.settings;
create policy set_read on public.settings for select using (true);

-- LICENSE KEYS: never readable by clients. Buyer sees key via order_items only.
drop policy if exists lk_admin on public.license_keys;
create policy lk_admin on public.license_keys for select using (public.is_admin());

-- ORDERS: user sees own
drop policy if exists o_read on public.orders;
create policy o_read on public.orders for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists oi_read on public.order_items;
create policy oi_read on public.order_items for select using (
  public.is_admin() or exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
);

-- TOPUPS: user creates + reads own
drop policy if exists t_read on public.topups;
create policy t_read on public.topups for select using (user_id = auth.uid() or public.is_admin());
drop policy if exists t_insert on public.topups;
create policy t_insert on public.topups for insert with check (user_id = auth.uid());

-- WALLET LEDGER: read own
drop policy if exists wt_read on public.wallet_txns;
create policy wt_read on public.wallet_txns for select using (user_id = auth.uid() or public.is_admin());

-- Admin-only writes.
-- orders, topups and wallet_txns are included because the admin panel mutates
-- them directly: setOrderStatus() updates orders, rejectTopup() updates topups,
-- and adjustWallet() inserts into wallet_txns. Without these policies those
-- three actions are silently denied by RLS.
do $$
declare t text;
begin
  foreach t in array array['categories','products','product_variants','payment_methods','faqs','coupons','settings','license_keys','orders','topups','wallet_txns']
  loop
    execute format('drop policy if exists %I on public.%I', t || '_admin_write', t);
    execute format(
      'create policy %I on public.%I for all using (public.is_admin()) with check (public.is_admin())',
      t || '_admin_write', t);
  end loop;
end $$;

-- ============================================================
-- CHECKOUT: atomic wallet purchase + key delivery
-- ============================================================
create or replace function public.checkout_with_wallet(
  p_items jsonb,          -- [{product_id, variant_id, qty}]
  p_note  text default null
)
returns public.orders
language plpgsql security definer set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_order  public.orders;
  v_item   jsonb;
  v_prod   public.products;
  v_var    public.product_variants;
  v_price  numeric(12,2);
  v_total  numeric(12,2) := 0;
  v_bal    numeric(12,2);
  v_key    public.license_keys;
  i        int;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if jsonb_array_length(coalesce(p_items,'[]'::jsonb)) = 0 then raise exception 'EMPTY_CART'; end if;

  -- Trusted debit path: allow this transaction to write profiles.wallet.
  -- Transaction-local (third arg true), so it clears on commit/rollback.
  perform set_config('app.bypass_profile_guard', 'on', true);

  select wallet into v_bal from public.profiles where id = v_uid for update;
  if v_bal is null then raise exception 'NO_PROFILE'; end if;

  insert into public.orders (user_id, status, total, pay_method, note)
  values (v_uid, 'pending', 0, 'wallet', p_note)
  returning * into v_order;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_prod from public.products
      where id = (v_item->>'product_id')::uuid and active = true;
    if v_prod.id is null then raise exception 'PRODUCT_UNAVAILABLE'; end if;

    v_price := v_prod.price;
    v_var := null;
    if v_item->>'variant_id' is not null then
      select * into v_var from public.product_variants
        where id = (v_item->>'variant_id')::uuid and product_id = v_prod.id and active = true;
      if v_var.id is null then raise exception 'VARIANT_UNAVAILABLE'; end if;
      v_price := v_var.price;
    end if;

    for i in 1..greatest(1, coalesce((v_item->>'qty')::int, 1)) loop
      -- lock one available key
      select * into v_key from public.license_keys
        where product_id = v_prod.id
          and status = 'available'
          and (v_var.id is null or variant_id is null or variant_id = v_var.id)
        order by created_at
        for update skip locked
        limit 1;
      if v_key.id is null then
        raise exception 'OUT_OF_STOCK: %', v_prod.name;
      end if;

      update public.license_keys
        set status='sold', order_id=v_order.id, sold_to=v_uid, sold_at=now()
        where id = v_key.id;

      insert into public.order_items
        (order_id, product_id, variant_id, product_name, variant_label, unit_price, qty, delivered_key)
      values
        (v_order.id, v_prod.id, v_var.id, v_prod.name, v_var.label, v_price, 1, v_key.key_value);

      v_total := v_total + v_price;
    end loop;
  end loop;

  if v_bal < v_total then raise exception 'INSUFFICIENT_FUNDS'; end if;

  update public.profiles set wallet = wallet - v_total where id = v_uid;
  insert into public.wallet_txns (user_id, amount, kind, ref_id, note)
    values (v_uid, -v_total, 'purchase', v_order.id, 'Order ' || v_order.order_no);

  update public.orders
    set total = v_total, status = 'delivered', delivered_at = now()
    where id = v_order.id
    returning * into v_order;

  return v_order;
end;
$$;

revoke all on function public.checkout_with_wallet(jsonb,text) from public;
grant execute on function public.checkout_with_wallet(jsonb,text) to authenticated;

-- ============================================================
-- ADMIN: approve a top-up (credits wallet atomically)
-- ============================================================
create or replace function public.approve_topup(p_topup_id uuid, p_note text default null)
returns public.topups
language plpgsql security definer set search_path = public
as $$
declare v_t public.topups;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;

  -- Trusted credit path: allow this transaction to write profiles.wallet.
  perform set_config('app.bypass_profile_guard', 'on', true);

  select * into v_t from public.topups where id = p_topup_id for update;
  if v_t.id is null then raise exception 'NOT_FOUND'; end if;
  if v_t.status <> 'pending' then raise exception 'ALREADY_REVIEWED'; end if;

  update public.profiles set wallet = wallet + v_t.amount where id = v_t.user_id;
  insert into public.wallet_txns (user_id, amount, kind, ref_id, note)
    values (v_t.user_id, v_t.amount, 'topup', v_t.id, coalesce(p_note,'Top-up approved'));

  update public.topups
    set status='approved', admin_note=p_note, reviewed_at=now()
    where id = p_topup_id returning * into v_t;
  return v_t;
end;
$$;

grant execute on function public.approve_topup(uuid,text) to authenticated;

-- ============================================================
-- SEED DATA
-- ============================================================
insert into public.categories (name, slug, sort) values
  ('Free Fire', 'free-fire', 1),
  ('PUBG / BGMI', 'pubg', 2),
  ('Panels & Tools', 'panels', 3)
on conflict (slug) do nothing;

insert into public.products (name, slug, tag, description, price, old_price, gradient, featured, sort)
values
  ('DRIP CLIENT', 'drip-client', 'FREE FIRE APKMOD', 'Premium Free Fire client with safe bypass and instant vault delivery.', 1500, 2200, 'orange', true, 1),
  ('HG CHEATS', 'hg-cheats', 'FREE FIRE APKMOD', 'Stable aim + ESP toolkit, updated weekly, works on most devices.', 1200, 1800, 'purple', true, 2),
  ('DRIP CLIENT PROXY', 'drip-client-proxy', 'FREE FIRE APKMOD', 'Proxy build with region unlock and lower ban risk.', 2000, 2800, 'cyan', true, 3)
on conflict (slug) do nothing;

insert into public.product_variants (product_id, label, price, duration_days, sort)
select p.id, v.label, calc.price, v.days, v.sort
from public.products p
cross join (values
  ('1 Day', 0.25, 1, 1),
  ('7 Days', 1.0, 7, 2),
  ('30 Days', 2.5, 30, 3)
) as v(label, mult, days, sort)
cross join lateral (select round(p.price * v.mult) as price) calc
where not exists (
  select 1 from public.product_variants pv where pv.product_id = p.id and pv.label = v.label
);

-- payment_methods and faqs have no unique key other than the generated id,
-- so "on conflict do nothing" would never fire and a re-run would duplicate
-- every row. Guard on the natural key instead.
insert into public.payment_methods (name, account_name, account_no, instructions, icon, sort)
select * from (values
  ('JazzCash', 'SH GAMING', '0300-0000000', 'Send the exact amount, then submit the TID below.', 'jazzcash', 1),
  ('Easypaisa', 'SH GAMING', '0345-0000000', 'Send the exact amount, then submit the TID below.', 'easypaisa', 2),
  ('Bank Transfer', 'SH GAMING', 'PK00 XXXX 0000 0000', 'IBAN transfer. Upload the receipt screenshot.', 'bank', 3),
  ('Binance Pay', 'SH GAMING', 'Binance ID: 000000000', 'Send USDT via Binance Pay, then paste the order ID.', 'binance', 4),
  ('USDT (TRC20)', 'SH GAMING', 'TXxxxxxxxxxxxxxxxxxxxxxxxxxxxx', 'TRC20 network only. Paste the TX hash.', 'usdt', 5)
) as m(name, account_name, account_no, instructions, icon, sort)
where not exists (
  select 1 from public.payment_methods pm where pm.name = m.name
);

insert into public.faqs (question, answer, sort)
select * from (values
  ('How fast is delivery?', 'Instant. Your key appears in your vault the moment payment clears.', 1),
  ('What payment methods do you accept?', 'JazzCash, Easypaisa, Bank Transfer, Binance Pay and USDT (TRC20).', 2),
  ('Is my wallet balance safe?', 'Yes. Balances are stored server-side with a full audit ledger on every change.', 3),
  ('Do you offer refunds?', 'If a key fails to activate and our team cannot fix it, we refund to wallet.', 4),
  ('How do I get support?', 'Tap the support button at the bottom right. We reply 24/7.', 5)
) as f(question, answer, sort)
where not exists (
  select 1 from public.faqs fq where fq.question = f.question
);

insert into public.settings (key, value) values
  ('store', '{"name":"SH GAMING STORE","currency":"PKR","support_url":"","announcement":""}'::jsonb)
on conflict (key) do nothing;

-- ============================================================
-- MAKE YOURSELF ADMIN (run after you sign up):
--   update public.profiles set role='admin' where email='you@example.com';
-- ============================================================

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

-- ============================================================
-- AUTOMATIC WALLET TOP-UPS (Binance Pay gateway)
-- ============================================================
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
