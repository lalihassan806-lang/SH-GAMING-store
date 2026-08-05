import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import SupportFab from "@/components/SupportFab";
import ProductCard from "@/components/ProductCard";
import WalletMock from "@/components/WalletMock";
import { IconArrow, IconBolt, IconShield, IconWallet, IconChat, IconPlus } from "@/components/Icons";
import { getProducts, getFaqs, getStoreStats, getPaymentMethods, compact } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [products, faqs, stats, methods] = await Promise.all([
    getProducts(),
    getFaqs(),
    getStoreStats(),
    getPaymentMethods(),
  ]);

  return (
    <>
      <div className="glow-field" />
      <div className="glow-cyan" />

      <div className="relative z-10">
        <SiteHeader />

        {/* ---------------- HERO ---------------- */}
        <section className="mx-auto max-w-7xl px-4 pb-8 pt-14 sm:px-6 sm:pt-20">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <span className="pill">
                <span className="h-1.5 w-1.5 rounded-full bg-gold-400" />
                Premium Gaming Store
              </span>

              <h1 className="mt-6 text-[2.6rem] font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl">
                Gaming keys.
                <br />
                Fast checkout.
                <br />
                <span className="bg-gold-grad bg-clip-text text-transparent">
                  Instant vault delivery.
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-white/55">
                Top up your wallet with JazzCash, Easypaisa, Bank Transfer, Binance
                Pay or USDT — then buy any key and get it in your vault instantly.
                No waiting, no manual approvals.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/products" className="btn-gold">
                  Login &amp; Buy
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-black/20">
                    <IconArrow className="h-3.5 w-3.5" />
                  </span>
                </Link>
                <Link href="/wallet" className="btn-ghost">
                  <IconWallet className="h-4 w-4" />
                  Top up wallet
                </Link>
              </div>

              {/* Inline stats */}
              <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
                {[
                  [compact(stats.orders), "Orders"],
                  [compact(stats.soldToday), "Sold Today"],
                  [compact(stats.keysReady), "Keys Ready"],
                ].map(([v, l]) => (
                  <div key={l}>
                    <div className="text-2xl font-extrabold text-white">{v}</div>
                    <div className="text-[11px] font-bold uppercase tracking-widest text-white/35">
                      {l}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <WalletMock />
          </div>
        </section>

        {/* ---------------- STAT BAND ---------------- */}
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {[
              [compact(stats.members), "Members"],
              [compact(stats.products), "Products"],
              [compact(stats.keysReady), "Keys In Vault"],
              ["24/7", "Live Support"],
            ].map(([v, l]) => (
              <div key={l} className="card p-5 text-center sm:p-6">
                <div className="bg-gold-grad bg-clip-text text-3xl font-extrabold text-transparent sm:text-4xl">
                  {v}
                </div>
                <div className="mt-1.5 text-[11px] font-bold uppercase tracking-widest text-white/40">
                  {l}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ---------------- PRODUCTS ---------------- */}
        <section id="products" className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="pill">Best Sellers</span>
              <h2 className="section-title mt-4">Featured products</h2>
              <p className="mt-2 text-sm text-white/50">
                Hand-picked keys with the fastest delivery and the best uptime.
              </p>
            </div>
            <Link href="/products" className="btn-ghost btn-sm">
              View all
              <IconArrow className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.slice(0, 6).map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>

          {products.length === 0 && (
            <div className="card mt-8 p-12 text-center text-sm text-white/45">
              No products yet. Add your first product from the admin panel.
            </div>
          )}
        </section>

        {/* ---------------- WHY ---------------- */}
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="text-center">
            <span className="pill">Why choose us</span>
            <h2 className="section-title mt-4">Built for gamers who hate waiting</h2>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: IconBolt, t: "Instant Delivery", d: "Keys land in your vault the second payment clears." },
              { icon: IconShield, t: "Secure Wallet", d: "Server-side balances with a full audit ledger." },
              { icon: IconWallet, t: "Flexible Payments", d: "JazzCash, Easypaisa, Bank, Binance and USDT." },
              { icon: IconChat, t: "Live Support", d: "Real humans replying around the clock, 24/7." },
            ].map(({ icon: Icon, t, d }) => (
              <div key={t} className="card card-hover p-6">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-gold-500/12 text-gold-400 ring-1 ring-gold-500/20">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-bold text-white">{t}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-white/50">{d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------------- PAYMENT METHODS ---------------- */}
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="card p-6 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-white">Accepted payments</h3>
                <p className="mt-1 text-sm text-white/50">
                  Pakistan-friendly methods. Wallet top-ups are approved fast.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {methods.map((m: any) => (
                  <span
                    key={m.id}
                    className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-bold text-white/70"
                  >
                    {m.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ---------------- FAQ ---------------- */}
        <section id="faq" className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
          <div className="text-center">
            <span className="pill">FAQ</span>
            <h2 className="section-title mt-4">Questions, answered</h2>
          </div>

          <div className="mt-8 space-y-3">
            {faqs.map((f: any) => (
              <details key={f.id} className="card group px-5 py-4">
                <summary className="flex items-center justify-between gap-4">
                  <span className="text-[15px] font-bold text-white">{f.question}</span>
                  <span className="faq-plus grid h-7 w-7 shrink-0 place-items-center rounded-full border border-gold-500/25 bg-gold-500/10 text-gold-400 transition-transform duration-300">
                    <IconPlus className="h-3.5 w-3.5" />
                  </span>
                </summary>
                <p className="mt-3 text-[13.5px] leading-relaxed text-white/55">
                  {f.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* ---------------- CTA ---------------- */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl border border-gold-500/20 bg-gradient-to-br from-gold-500/12 via-white/[0.03] to-transparent p-8 text-center sm:p-14">
            <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-gold-500/25 blur-[100px]" />
            <div className="relative">
              <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Ready to start?
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm text-white/55">
                Create your account, top up your wallet and grab your first key in
                under two minutes.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link href="/signup" className="btn-gold">
                  Create free account
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-black/20">
                    <IconArrow className="h-3.5 w-3.5" />
                  </span>
                </Link>
                <Link href="/products" className="btn-ghost">
                  Browse products
                </Link>
              </div>
            </div>
          </div>
        </section>

        <SiteFooter />
      </div>

      <SupportFab />
    </>
  );
}
