-- SH GAMING STORE — 03-security.sql
-- Run the parts IN ORDER (01 then 02 ...). Each is safe to re-run.

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
