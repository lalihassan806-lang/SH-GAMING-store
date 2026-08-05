# SH GAMING STORE

Gaming key store with wallet checkout, instant key delivery and a full admin panel.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS · Supabase (Postgres + Auth + RLS)

---

## Features

### Storefront
- Home page: hero, live stat counters, featured products, feature grid, payment methods, FAQ accordion, CTA
- Product listing + detail page with duration variants and quantity picker
- Wallet page: balance, payment account details, top-up request form with history
- Account vault: wallet balance, order history, delivered keys
- Order receipt page showing the delivered key
- Email + password auth (login / signup / logout)

### Admin panel (`/admin`)
| Page | What it does |
|---|---|
| Dashboard | Revenue, orders, members, keys ready, 14-day revenue chart, pending-action alerts, recent orders and top-ups |
| Products | List, create, edit, show/hide, delete; manage duration variants per product |
| Orders | All orders with buyer, item, method, total; change order status |
| Key Vault | Bulk-load keys (one per line), view inventory, delete unused keys (delivered keys are locked) |
| Top-ups | Approve or reject wallet top-up requests; approving credits the wallet atomically |
| Users | Wallet balances, role promote/demote, ban/unban, manual balance adjustments with audit trail |
| Payments | Manage JazzCash / Easypaisa / Bank / Binance / USDT account details shown to buyers |
| FAQ | Add, edit and remove the questions shown on the home page |
| Settings | Store name, currency, support link, announcement + connection status |

### Security model
- Row Level Security on every table
- License keys are **never** readable by clients — buyers only see their own delivered key through `order_items`
- Checkout runs in a single `security definer` Postgres function: locks a key with `FOR UPDATE SKIP LOCKED`, debits the wallet, writes the ledger and marks the order delivered — all atomic, so no double-spend and no double-sold key
- Prices are resolved server-side; the client cannot submit its own price
- Admin role is re-verified against the database on every admin page load and every server action
- Service-role key is server-only and never imported into client code

---

## Setup

### 1. Install
```bash
npm install
```

### 2. Create a Supabase project
Grab the values from **Project Settings → API**, then create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

NEXT_PUBLIC_STORE_NAME=SH GAMING STORE
NEXT_PUBLIC_SUPPORT_URL=https://wa.me/920000000000
```

### 3. Create the database
Open **SQL Editor** in the Supabase dashboard, paste the whole of
`supabase/schema.sql` and run it. It creates every table, RLS policy, trigger and
function, and seeds demo products, payment methods and FAQs. It is safe to re-run.

### 4. Make yourself an admin
Sign up through `/signup`, then run this once in the SQL editor:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

Now `/admin` is unlocked for that account.

### 5. Run
```bash
npm run dev     # http://localhost:3000
```

---

## Demo mode

If `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are missing, the app
runs on an in-memory sample dataset so every screen — including the admin panel — is
browsable without a backend. Writes are disabled and each admin page shows a demo
banner. Adding the env vars switches everything to the real database automatically;
no code changes needed.

---

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import it in Vercel.
3. Add the same environment variables under **Settings → Environment Variables**
   (including `SUPABASE_SERVICE_ROLE_KEY`, which must stay server-side).
4. Deploy. Vercel redeploys on every push to the default branch.

---

## Going live checklist

- [ ] `supabase/schema.sql` executed
- [ ] Env vars set locally and in Vercel
- [ ] Your account promoted to `admin`
- [ ] Real payment account numbers entered in **Admin → Payments**
- [ ] Support link set in **Admin → Settings**
- [ ] Real products created and keys loaded in **Admin → Key Vault**
- [ ] Seeded demo products removed or replaced
- [ ] Email confirmation configured in Supabase → Authentication → Providers

---

## Project structure

```
src/
  app/
    page.tsx                 Home
    products/                Listing + [slug] detail
    wallet/                  Top-up page
    account/                 Vault + orders/[id]
    login/ signup/ logout/   Auth
    api/checkout/            Wallet checkout endpoint
    api/topup/               Top-up request endpoint
    admin/
      layout.tsx             Role guard + sidebar shell
      actions.ts             All admin server actions
      page.tsx               Dashboard
      products/ orders/ keys/ topups/ users/ payments/ faqs/ settings/
  components/                Shared UI + admin/ subfolder
  lib/
    supabase/                Browser, server and service-role clients
    auth.ts                  Session, profile, requireUser, requireAdmin
    data.ts                  Storefront queries (demo-aware)
    admin-data.ts            Admin queries (demo-aware)
    demo.ts                  Sample dataset + isDemo flag
  proxy.ts                   Refreshes the Supabase session cookie
supabase/schema.sql          Tables, RLS, triggers, checkout function
```
