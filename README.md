# SH GAMING STORE

Gaming key store with wallet checkout, instant key delivery and a full admin panel.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS · Supabase (Postgres + Auth + RLS)

---

## Features

### Storefront
- Home page: hero, live stat counters, featured products, feature grid, payment methods, FAQ accordion, CTA
- Product listing + detail page with duration variants and quantity picker
- Wallet page: balance, **instant Binance Pay top-up**, manual payment account details, top-up request form with history
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
- The gateway credit function is granted to `service_role` **only** — a customer's session cannot reach it even with a valid login
- Payment webhooks are RSA-verified against Binance's published public key before a single field of the body is trusted, and fail closed if the key cannot be fetched

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

# Binance Pay — automatic wallet top-ups. Server-only. Optional: leave blank
# and the instant top-up card disappears, manual top-ups keep working.
BINANCE_PAY_API_KEY=
BINANCE_PAY_SECRET_KEY=
NEXT_PUBLIC_SITE_URL=https://your-store.vercel.app

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

### 6. Connect Binance Pay (optional — for instant top-ups)

Without this, top-ups stay manual: the buyer sends money, submits a reference,
and you approve it in **Admin → Top-ups**. With it, the wallet is credited the
moment Binance confirms the payment and no approval is needed.

1. In the [Binance Merchant Admin Portal](https://merchant.binance.com), go to
   **Developer → API keys** and create a key pair. Put the two values in
   `BINANCE_PAY_API_KEY` and `BINANCE_PAY_SECRET_KEY`.
2. Deploy, then set `NEXT_PUBLIC_SITE_URL` to your live URL.
3. In the portal, under **Developer → Notification**, set the webhook URL to:
   ```
   https://YOUR-DOMAIN/api/wallet/binance/webhook
   ```
4. Test with a small amount — Rs 100 — before announcing it.

The webhook is the only place in the app where a wallet gains money without a
human approving it, so it verifies every notification's RSA signature against
Binance's published public key and rejects anything that fails. It also credits
the amount stored in *our* database rather than the amount in the notification,
so a tampered payload cannot inflate a balance.

**Your webhook URL must be publicly reachable over HTTPS.** On `localhost`
Binance cannot call back, so the instant credit will not complete during local
development — the buyer's browser polls `/api/wallet/binance/status` as a
fallback, which does work locally.

### 7. Run
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
- [ ] For instant top-ups: Binance Pay keys set, `NEXT_PUBLIC_SITE_URL` set, and
      the webhook URL saved in the Merchant Portal
- [ ] One small real top-up (Rs 100) tested end to end
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
    api/topup/               Manual top-up request endpoint
    api/wallet/binance/      create · webhook (RSA-verified) · status fallback
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
    binance-pay.ts           Payment gateway client (server-only)
  proxy.ts                   Refreshes the Supabase session cookie
supabase/schema.sql          Everything, in one runnable file
supabase/parts/              The same schema split 01..07 for readability
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

## How an instant top-up works

1. The buyer picks an amount. `/api/wallet/binance/create` writes a
   `gateway_payments` row holding the **PKR** figure, then asks Binance for a
   checkout link. No money has moved.
2. The buyer pays on Binance's hosted page.
3. Binance POSTs to `/api/wallet/binance/webhook`. The signature is verified
   before anything in the body is trusted, then `credit_gateway_payment`
   credits the wallet, writes a `wallet_txns` row and inserts an approved
   `topups` row so the payment shows up in the normal history and admin screens.

Binance retries a notification up to six times until acknowledged, so the credit
is idempotent: the row is locked with `FOR UPDATE` and a second notification for
an already-credited payment is a no-op that still answers `SUCCESS`.

The order is created with `fiatAmount` + `fiatCurrency`, so **Binance** does the
PKR→crypto conversion at its own live rate. There is no exchange rate in this
codebase to maintain, and no stale rate that could sell a top-up too cheaply.

Two wallets are in play and should not be confused: the customer's **PKR** wallet
lives in `profiles.wallet`, while your **USD** deposit lives with the supplier.
Retail prices are set by hand in PKR; there is no exchange-rate conversion in the
code. Supplier costs are USD *microcents* (1 USD = 100,000,000) and are stored
raw — never divide them by 100.
