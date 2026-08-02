# DRIP Store — Next.js + Supabase digital-product store

Full-stack e-commerce starter inspired by your original site. Dark + purple
theme, product catalog with categories, Supabase auth, manual JazzCash /
EasyPaisa checkout, and an admin panel for products & orders.

## Stack

- **Next.js 15** (App Router, TypeScript, Server Actions)
- **Tailwind CSS** + custom `drip-*` classes (dark + fuchsia/purple)
- **Supabase** (Postgres + Auth + RLS)
- **Sonner** for toasts, **Lucide** for icons

## 1. Prerequisites

- Node.js **≥ 20**
- A free Supabase project → https://supabase.com
- (For deploy) A Vercel account → https://vercel.com

## 2. Supabase setup

1. Create a new project on Supabase. Note the **Project URL**, the **anon
   public key** and the **service_role key** (Project settings → API).
2. Open **SQL Editor**, paste the contents of `supabase/schema.sql`, and
   run it. This creates tables, RLS policies, and seeds three categories
   (APK Mods, FF Proxy, iOS Panel).
3. Auth → Providers → keep **Email** enabled. If you don't want email
   confirmation while testing, disable "Confirm email".
4. Auth → URL Configuration → set **Site URL** to `http://localhost:3000`
   during dev, and to your production URL later.

## 3. Local install

```bash
cp .env.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY, and your JazzCash / EasyPaisa numbers

npm install
npm run dev
```

Open http://localhost:3000

## 4. Make yourself admin

1. Go to `/signup` and create an account.
2. Confirm the email (or disable confirmation in Supabase → Auth).
3. In Supabase → **Table editor → `profiles`**, find your row and set
   `is_admin = true`.
4. Refresh the site — the **Admin** link appears in the header.

## 5. Add products

`/admin` → fill the form on the right → save. Products immediately show
up on the home page. Toggle **Active** to hide/show without deleting.

## 6. How ordering works

1. User signs in and clicks **Buy now** on a product.
2. Checkout page shows your JazzCash / EasyPaisa numbers and the amount.
3. User sends the money, gets a TID (transaction ID) via SMS, and submits
   the form. An `orders` row is created with status `pending`.
4. Admin visits `/admin/orders`, verifies the TID with their bank/wallet,
   then sets the status to `paid` or `delivered` and (optionally) writes
   a note the buyer can see under **My orders**.

Prices are always read from the DB on the server — the client cannot
tamper with the amount.

## 7. Deploy to Vercel

1. Push this folder to a GitHub repo.
2. On Vercel → **New project** → import the repo.
3. Add the same env vars from `.env.local` under **Settings → Environment
   variables**.
4. Update `NEXT_PUBLIC_SITE_URL` to your Vercel URL (e.g.
   `https://drip-store.vercel.app`) and also add that URL under Supabase
   → Auth → URL Configuration.
5. Deploy.

## 8. Upgrading to a real payment gateway

The manual JazzCash/EasyPaisa flow is intentionally simple. When you
have a merchant account, replace `src/app/actions/orders.ts` with a call
to the gateway's checkout API, then flip `status` to `paid` via their
webhook (create a new route under `src/app/api/webhooks/...`).

## Project layout

```
src/
  app/
    page.tsx                 home + product grid
    product/[slug]/          product detail
    checkout/[slug]/         checkout form
    orders/                  buyer's own orders
    login/  signup/  auth/callback/
    admin/                   admin panel (products + orders)
    actions/                 server actions (auth, orders, admin)
  components/
    ui/                      button, card, input, badge…
    site-header.tsx  site-footer.tsx  product-card.tsx  category-tabs.tsx
  lib/
    supabase/                client / server / admin / types
    utils.ts
supabase/schema.sql          run in Supabase SQL editor
```

## License

You own this codebase — do what you want with it.
