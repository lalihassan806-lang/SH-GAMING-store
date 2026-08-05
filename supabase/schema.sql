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
select p.id, v.label, v.price, v.days, v.sort
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

insert into public.payment_methods (name, account_name, account_no, instructions, icon, sort)
values
  ('JazzCash', 'SH GAMING', '0300-0000000', 'Send the exact amount, then submit the TID below.', 'jazzcash', 1),
  ('Easypaisa', 'SH GAMING', '0345-0000000', 'Send the exact amount, then submit the TID below.', 'easypaisa', 2),
  ('Bank Transfer', 'SH GAMING', 'PK00 XXXX 0000 0000', 'IBAN transfer. Upload the receipt screenshot.', 'bank', 3),
  ('Binance Pay', 'SH GAMING', 'Binance ID: 000000000', 'Send USDT via Binance Pay, then paste the order ID.', 'binance', 4),
  ('USDT (TRC20)', 'SH GAMING', 'TXxxxxxxxxxxxxxxxxxxxxxxxxxxxx', 'TRC20 network only. Paste the TX hash.', 'usdt', 5)
on conflict do nothing;

insert into public.faqs (question, answer, sort) values
  ('How fast is delivery?', 'Instant. Your key appears in your vault the moment payment clears.', 1),
  ('What payment methods do you accept?', 'JazzCash, Easypaisa, Bank Transfer, Binance Pay and USDT (TRC20).', 2),
  ('Is my wallet balance safe?', 'Yes. Balances are stored server-side with a full audit ledger on every change.', 3),
  ('Do you offer refunds?', 'If a key fails to activate and our team cannot fix it, we refund to wallet.', 4),
  ('How do I get support?', 'Tap the support button at the bottom right. We reply 24/7.', 5)
on conflict do nothing;

insert into public.settings (key, value) values
  ('store', '{"name":"SH GAMING STORE","currency":"PKR","support_url":"","announcement":""}'::jsonb)
on conflict (key) do nothing;

-- ============================================================
-- MAKE YOURSELF ADMIN (run after you sign up):
--   update public.profiles set role='admin' where email='you@example.com';
-- ============================================================
