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

# Supplier API — server-only, spends your deposit. Never use NEXT_PUBLIC_.
DRIP_API_KEY=drip_sk_live_xxxxxxxx
DRIP_BASE_URL=https://dripclientofficial.dev

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

If the role still reads `user` afterwards, the `guard_profile_columns` trigger
reverted it — that trigger blocks non-admins from editing their own `role`, which
is what stops a customer promoting themselves. Bypass it for one transaction:

```sql
begin;
select set_config('app.bypass_profile_guard', 'on', true);
update public.profiles set role = 'admin'
  where email = 'you@example.com'
  returning id, email, role;
commit;
```

The `returning` clause matters: an `update` that matches no rows still reports
success, which is the usual reason this appears to have worked when it has not.

### 5. Connect the supplier

Products are fulfilled by the supplier's API at purchase time. In **Admin →
Products**, set **Delivery source** to *Supplier*, then paste the supplier SKU
into each duration option — the **Supplier catalogue** panel on the product edit
page lists every SKU with its cost and has a copy button.

SKUs live on the duration option, not the product: the supplier's catalogue is
keyed per duration, so a product-level code is rejected.

Test with a `drip_sk_test_` key and the SKU `SANDBOX-DEMO-30D` before pointing a
live key at real money.

### 6. Run
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
- [ ] Env vars set locally and in Vercel (including `DRIP_API_KEY`)
- [ ] Your account promoted to `admin`
- [ ] A supplier SKU saved on every duration option you sell
- [ ] One test purchase with a `drip_sk_test_` key before going live
- [ ] Deposit topped up with the supplier — an empty deposit refunds buyers
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
    api/checkout/            Reserve → supplier call → settle/refund
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
    drip.ts                  Supplier API client (server-only)
  proxy.ts                   Refreshes the Supabase session cookie
supabase/schema.sql          Everything, in one runnable file
supabase/parts/              The same schema split 01..06 for readability
```

---

## How a purchase works

The HTTP call to the supplier cannot happen inside a database transaction: a
hung supplier would hold a row lock on the buyer's wallet. So checkout is three
short transactions with the network call between them.

1. **`reserve_order`** — debits the wallet and creates the order as `paid`.
   The buyer is charged *before* the supplier is called, which is what makes
   double-spend impossible.
2. **`POST /api/v1/orders`** — buys the key, using our own order id as the
   `Idempotency-Key` so a network retry returns the original order instead of
   charging the deposit twice.
3. **`settle_order`** — attaches the key and marks the order `delivered`.
   On any failure in step 2, **`refund_order`** returns the money and cancels
   the order, and the wallet ledger shows both movements.

`refund_order` refuses to refund an order that is already `delivered`, so a
buyer cannot keep the key and get the money back. Conversely, if step 3 fails
after the key was bought, the order is left `paid` for manual review and the key
is still shown to the buyer — they paid for it.

Two wallets are in play and should not be confused: the customer's **PKR** wallet
lives in `profiles.wallet`, while your **USD** deposit lives with the supplier.
Retail prices are set by hand in PKR; there is no exchange-rate conversion in the
code. Supplier costs are USD *microcents* (1 USD = 100,000,000) and are stored
raw — never divide them by 100.
