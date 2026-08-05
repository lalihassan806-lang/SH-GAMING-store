/**
 * Demo mode.
 *
 * When Supabase env vars are absent the app serves this in-memory dataset so the
 * UI is fully browsable (including the admin panel) before a backend is wired.
 * Writes are non-persistent in demo mode. As soon as NEXT_PUBLIC_SUPABASE_URL and
 * NEXT_PUBLIC_SUPABASE_ANON_KEY are set, every query hits the real database.
 */

export const isDemo =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export type DemoProduct = {
  id: string;
  name: string;
  slug: string;
  tag: string;
  description: string;
  price: number;
  old_price: number | null;
  gradient: string;
  active: boolean;
  featured: boolean;
  stock: number;
  variants: { id: string; label: string; price: number }[];
};

export const demoProducts: DemoProduct[] = [
  {
    id: "p1",
    name: "DRIP CLIENT",
    slug: "drip-client",
    tag: "FREE FIRE APKMOD",
    description:
      "Premium Free Fire client with safe bypass, weekly updates and instant vault delivery.",
    price: 1500,
    old_price: 2200,
    gradient: "orange",
    active: true,
    featured: true,
    stock: 42,
    variants: [
      { id: "p1v1", label: "1 Day", price: 375 },
      { id: "p1v2", label: "7 Days", price: 1500 },
      { id: "p1v3", label: "30 Days", price: 3750 },
    ],
  },
  {
    id: "p2",
    name: "HG CHEATS",
    slug: "hg-cheats",
    tag: "FREE FIRE APKMOD",
    description:
      "Stable aim assist and ESP toolkit. Tested on most devices, updated weekly.",
    price: 1200,
    old_price: 1800,
    gradient: "purple",
    active: true,
    featured: true,
    stock: 37,
    variants: [
      { id: "p2v1", label: "1 Day", price: 300 },
      { id: "p2v2", label: "7 Days", price: 1200 },
      { id: "p2v3", label: "30 Days", price: 3000 },
    ],
  },
  {
    id: "p3",
    name: "DRIP CLIENT PROXY",
    slug: "drip-client-proxy",
    tag: "FREE FIRE APKMOD",
    description:
      "Proxy build with region unlock and reduced ban risk. Premium support included.",
    price: 2000,
    old_price: 2800,
    gradient: "cyan",
    active: true,
    featured: true,
    stock: 45,
    variants: [
      { id: "p3v1", label: "1 Day", price: 500 },
      { id: "p3v2", label: "7 Days", price: 2000 },
      { id: "p3v3", label: "30 Days", price: 5000 },
    ],
  },
];

export const demoFaqs = [
  {
    id: "f1",
    question: "How fast is delivery?",
    answer:
      "Instant. Your key lands in your vault the moment the payment clears — no waiting for manual approval.",
  },
  {
    id: "f2",
    question: "What payment methods do you accept?",
    answer:
      "JazzCash, Easypaisa, Bank Transfer, Binance Pay and USDT (TRC20).",
  },
  {
    id: "f3",
    question: "Is my wallet balance safe?",
    answer:
      "Yes. Balances live server-side and every change is written to an audit ledger you can review in your account.",
  },
  {
    id: "f4",
    question: "Do you offer refunds?",
    answer:
      "If a key fails to activate and our team cannot resolve it, we refund the amount straight to your wallet.",
  },
  {
    id: "f5",
    question: "How do I contact support?",
    answer:
      "Tap the support button at the bottom right of any page. Our team replies 24/7.",
  },
];

export const demoPaymentMethods = [
  { id: "m1", name: "JazzCash", account_no: "0300-0000000", icon: "jazzcash", active: true },
  { id: "m2", name: "Easypaisa", account_no: "0345-0000000", icon: "easypaisa", active: true },
  { id: "m3", name: "Bank Transfer", account_no: "PK00 XXXX 0000 0000", icon: "bank", active: true },
  { id: "m4", name: "Binance Pay", account_no: "Binance ID: 000000000", icon: "binance", active: true },
  { id: "m5", name: "USDT (TRC20)", account_no: "TXxxxxxxxxxxxxxxxx", icon: "usdt", active: true },
];

export const demoStats = {
  orders: 2200,
  soldToday: 12,
  keysReady: 124,
  members: 1800,
  products: 22,
  revenue: 486500,
};

export const demoOrders = [
  { id: "o1", order_no: "SH-8F2A91C4", user: "ahmed_ff", product: "DRIP CLIENT", variant: "30 Days", total: 3750, status: "delivered", method: "JazzCash", created_at: "2026-08-04T09:12:00Z" },
  { id: "o2", order_no: "SH-2B71D0E9", user: "zain.gaming", product: "HG CHEATS", variant: "7 Days", total: 1200, status: "delivered", method: "Easypaisa", created_at: "2026-08-04T08:41:00Z" },
  { id: "o3", order_no: "SH-C4E80A17", user: "hamza_op", product: "DRIP CLIENT PROXY", variant: "30 Days", total: 5000, status: "pending", method: "Binance Pay", created_at: "2026-08-04T08:05:00Z" },
  { id: "o4", order_no: "SH-77A3B9F2", user: "bilal_yt", product: "DRIP CLIENT", variant: "7 Days", total: 1500, status: "delivered", method: "Wallet", created_at: "2026-08-03T21:30:00Z" },
  { id: "o5", order_no: "SH-E1C55D08", user: "usman_pro", product: "HG CHEATS", variant: "1 Day", total: 300, status: "cancelled", method: "USDT", created_at: "2026-08-03T19:14:00Z" },
  { id: "o6", order_no: "SH-90BB4A6D", user: "sara_ff", product: "DRIP CLIENT PROXY", variant: "7 Days", total: 2000, status: "delivered", method: "Bank Transfer", created_at: "2026-08-03T17:02:00Z" },
];

export const demoUsers = [
  { id: "u1", username: "ahmed_ff", email: "ahmed@example.com", role: "user", wallet: 2480, orders: 14, banned: false, created_at: "2026-05-02T10:00:00Z" },
  { id: "u2", username: "zain.gaming", email: "zain@example.com", role: "user", wallet: 640, orders: 9, banned: false, created_at: "2026-05-19T10:00:00Z" },
  { id: "u3", username: "hamza_op", email: "hamza@example.com", role: "user", wallet: 0, orders: 3, banned: false, created_at: "2026-06-07T10:00:00Z" },
  { id: "u4", username: "shgaming", email: "owner@shgaming.store", role: "admin", wallet: 0, orders: 0, banned: false, created_at: "2026-04-01T10:00:00Z" },
  { id: "u5", username: "spam_acc", email: "spam@example.com", role: "user", wallet: 0, orders: 0, banned: true, created_at: "2026-07-22T10:00:00Z" },
];

export const demoTopups = [
  { id: "t1", user: "ahmed_ff", amount: 3000, method: "JazzCash", tx_ref: "JC8837201", status: "pending", created_at: "2026-08-04T09:40:00Z" },
  { id: "t2", user: "zain.gaming", amount: 1500, method: "Easypaisa", tx_ref: "EP5540912", status: "pending", created_at: "2026-08-04T09:05:00Z" },
  { id: "t3", user: "hamza_op", amount: 5000, method: "Binance Pay", tx_ref: "BN-99120384", status: "approved", created_at: "2026-08-03T14:22:00Z" },
  { id: "t4", user: "bilal_yt", amount: 800, method: "USDT", tx_ref: "0xa91f...c4", status: "rejected", created_at: "2026-08-02T11:10:00Z" },
];

export const demoKeys = [
  { id: "k1", product: "DRIP CLIENT", variant: "30 Days", key_value: "DRIP-30D-A91F-88C2", status: "available" },
  { id: "k2", product: "DRIP CLIENT", variant: "7 Days", key_value: "DRIP-07D-2B7C-0E41", status: "available" },
  { id: "k3", product: "HG CHEATS", variant: "30 Days", key_value: "HGCH-30D-77D9-A0B3", status: "sold" },
  { id: "k4", product: "HG CHEATS", variant: "1 Day", key_value: "HGCH-01D-C480-15FA", status: "available" },
  { id: "k5", product: "DRIP CLIENT PROXY", variant: "30 Days", key_value: "DRPX-30D-E15C-9D22", status: "available" },
  { id: "k6", product: "DRIP CLIENT PROXY", variant: "7 Days", key_value: "DRPX-07D-4419-B7E8", status: "sold" },
];

/** Sales for the last 14 days — drives the dashboard chart. */
export const demoSalesSeries = [
  4200, 3100, 5600, 4800, 7200, 6100, 8400, 5200, 6800, 9100, 7600, 10200, 8800, 11400,
];
