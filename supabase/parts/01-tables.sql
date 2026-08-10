-- SH GAMING STORE — 01-tables.sql
-- Run the parts IN ORDER (01 then 02 ...). Each is safe to re-run.

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
