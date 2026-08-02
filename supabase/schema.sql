-- =====================================================================
-- DRIP STORE — Supabase schema
-- Run this in Supabase → SQL editor after creating a new project.
-- =====================================================================

-- ---------- Extensions ----------
create extension if not exists "pgcrypto";

-- ---------- Categories ----------
create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,
  name       text not null,
  created_at timestamptz not null default now()
);

-- ---------- Products ----------
create table if not exists public.products (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  slug         text unique not null,
  description  text,
  price        numeric(10,2) not null check (price >= 0),
  image_url    text,
  demo_url     text,
  category_id  uuid references public.categories(id) on delete set null,
  is_active    boolean not null default true,
  rating       numeric(2,1) default 5,
  review_count int default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists products_category_idx on public.products(category_id);
create index if not exists products_active_idx   on public.products(is_active);

-- ---------- Profiles (mirrors auth.users) ----------
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  full_name  text,
  is_admin   boolean not null default false,
  created_at timestamptz not null default now()
);

-- Auto-create profile row when a user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Orders ----------
create type order_status as enum ('pending','paid','delivered','cancelled');

create table if not exists public.orders (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete set null,
  product_id     uuid references public.products(id) on delete set null,
  product_title  text not null,
  amount         numeric(10,2) not null,
  payment_method text not null check (payment_method in ('jazzcash','easypaisa')),
  txn_id         text,
  buyer_name     text,
  buyer_contact  text,
  buyer_email    text,
  status         order_status not null default 'pending',
  admin_note     text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists orders_user_idx   on public.orders(user_id);
create index if not exists orders_status_idx on public.orders(status);

-- ---------- Helper: is current user admin? ----------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- ---------- RLS ----------
alter table public.categories enable row level security;
alter table public.products   enable row level security;
alter table public.profiles   enable row level security;
alter table public.orders     enable row level security;

-- Categories: readable by everyone, writable by admin
drop policy if exists categories_read on public.categories;
create policy categories_read on public.categories for select using (true);

drop policy if exists categories_admin_write on public.categories;
create policy categories_admin_write on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

-- Products: active readable by everyone, admin full access
drop policy if exists products_read on public.products;
create policy products_read on public.products
  for select using (is_active or public.is_admin());

drop policy if exists products_admin_write on public.products;
create policy products_admin_write on public.products
  for all using (public.is_admin()) with check (public.is_admin());

-- Profiles: user can read/update own row; admin can read all
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
  for select using (auth.uid() = id or public.is_admin());

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Orders: user sees own orders; admin sees all
drop policy if exists orders_own_select on public.orders;
create policy orders_own_select on public.orders
  for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists orders_insert_any_auth on public.orders;
create policy orders_insert_any_auth on public.orders
  for insert with check (auth.uid() = user_id);

drop policy if exists orders_admin_update on public.orders;
create policy orders_admin_update on public.orders
  for update using (public.is_admin()) with check (public.is_admin());

-- ---------- Seed data ----------
insert into public.categories (slug, name) values
  ('apkmod',   'APK Mods'),
  ('ffproxy',  'FF Proxy'),
  ('iospanel', 'iOS Panel')
on conflict (slug) do nothing;

-- =====================================================================
-- After running this file:
-- 1. Sign up your own account through the app (/signup).
-- 2. In Supabase → Table editor → profiles, set is_admin = true for your row.
-- 3. Refresh app — /admin will be accessible.
-- =====================================================================
