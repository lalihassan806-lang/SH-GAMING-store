import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import SupportFab from "@/components/SupportFab";
import TopupForm from "@/components/TopupForm";
import AutoTopup from "@/components/AutoTopup";
import StatusBadge from "@/components/StatusBadge";
import { IconWallet } from "@/components/Icons";
import { getPaymentMethods } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { getProfile, money } from "@/lib/auth";
import { isDemo } from "@/lib/demo";
import { gatewayEnabled } from "@/lib/binance-pay";

export const dynamic = "force-dynamic";

export default async function WalletPage() {
  const methods = await getPaymentMethods();
  const profile = isDemo ? null : await getProfile();

  let topups: any[] = [];
  if (!isDemo && profile) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("topups")
      .select("id,amount,method,tx_ref,status,created_at")
      .order("created_at", { ascending: false })
      .limit(10);
    topups = data ?? [];
  }

  return (
    <>
      <div className="glow-field" />
      <div className="relative z-10">
        <SiteHeader />

        <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <span className="pill">Wallet</span>
          <h1 className="section-title mt-4">Top up your balance</h1>
          <p className="mt-2 max-w-xl text-sm text-white/50">
            {gatewayEnabled
              ? "Pay with Binance Pay for an instant credit, or send to any account below and submit the reference for manual approval."
              : "Send the amount to any account below, then submit the transaction reference. Our team approves top-ups fast."}
          </p>

          <div className="mt-9 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            {/* Balance + methods */}
            <div>
              <div className="card overflow-hidden">
                <div className="relative bg-gold-grad p-6 text-black">
                  <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_85%_15%,rgba(255,255,255,.8),transparent_45%)]" />
                  <div className="relative flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] opacity-70">
                    <IconWallet className="h-3.5 w-3.5" />
                    Current balance
                  </div>
                  <div className="relative mt-2 text-4xl font-extrabold tracking-tight">
                    {profile ? money(profile.wallet) : "Rs 0"}
                  </div>
                </div>

                <div className="divide-y divide-white/8">
                  {methods.map((m: any) => (
                    <div key={m.id} className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[13.5px] font-bold text-white">
                          {m.name}
                        </span>
                        <code className="text-[12px] font-bold text-gold-400">
                          {m.account_no}
                        </code>
                      </div>
                      {m.instructions && (
                        <p className="mt-1.5 text-[11.5px] leading-relaxed text-white/40">
                          {m.instructions}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Form + history */}
            <div className="space-y-6">
              {/* Instant path first: it needs no admin and no waiting, so it is
                  the one most buyers should reach for. Renders nothing at all
                  when the gateway has no credentials. */}
              <AutoTopup
                enabled={gatewayEnabled || isDemo}
                demo={isDemo}
                loggedIn={!!profile}
              />

              <TopupForm
                methods={methods.map((m: any) => m.name)}
                demo={isDemo}
                loggedIn={!!profile}
              />

              {topups.length > 0 && (
                <div>
                  <h2 className="text-lg font-bold text-white">
                    Your top-up requests
                  </h2>
                  <div className="card mt-4 divide-y divide-white/8">
                    {topups.map((t) => (
                      <div key={t.id} className="flex items-center justify-between gap-3 p-4">
                        <div>
                          <div className="text-[14px] font-bold text-white">
                            {money(t.amount)}
                          </div>
                          <div className="text-[11.5px] font-semibold text-white/40">
                            {t.method} · {t.tx_ref || "no ref"}
                          </div>
                        </div>
                        <StatusBadge status={t.status} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        <SiteFooter />
      </div>
      <SupportFab />
    </>
  );
}
