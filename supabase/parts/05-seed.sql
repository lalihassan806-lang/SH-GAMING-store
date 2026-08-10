-- SH GAMING STORE — 05-seed.sql
-- Run the parts IN ORDER (01 then 02 ...). Each is safe to re-run.

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
