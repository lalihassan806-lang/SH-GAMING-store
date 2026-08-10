import { IconBolt, IconKey, IconWallet } from "./Icons";
import { money } from "@/lib/auth";

type Row = { n: string; v: string; g: string };

/**
 * Wallet/vault card beside the hero copy.
 *
 * `balance` is the signed-in user's real wallet, or null when nobody is signed
 * in — in that case the strip shows a dash rather than a made-up figure, so a
 * visitor is never shown a balance that looks like their own.
 * `rows` are real product names when available.
 */
export default function WalletMock({
  balance = null,
  rows,
}: {
  balance?: number | null;
  rows?: Row[];
}) {
  const items: Row[] =
    rows && rows.length
      ? rows.slice(0, 3)
      : [
          { n: "Your keys appear here", v: "Instant delivery", g: "grad-orange" },
        ];

  return (
    <div className="relative animate-floaty">
      <div className="pointer-events-none absolute -inset-6 rounded-[2rem] bg-gold-500/12 blur-3xl" />

      <div className="card relative overflow-hidden p-5 shadow-card sm:p-6">
        {/* Balance strip */}
        <div className="relative overflow-hidden rounded-2xl bg-gold-grad p-5 text-black">
          <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_85%_15%,rgba(255,255,255,.8),transparent_45%)]" />
          <div className="relative flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] opacity-70">
                <IconWallet className="h-3.5 w-3.5" />
                Wallet Balance
              </div>
              <div className="mt-2 text-4xl font-extrabold tracking-tight">
                {balance != null ? money(balance) : "Rs —"}
              </div>
            </div>
            <span className="rounded-full bg-black/15 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider">
              {balance != null ? "Active" : "Sign in"}
            </span>
          </div>
          <div className="relative mt-5 flex items-center justify-between text-[11px] font-bold">
            <span className="opacity-70">Wallet</span>
            <span className="opacity-70">SH GAMING</span>
          </div>
        </div>

        {/* Vault rows */}
        <div className="mt-4 space-y-2.5">
          {items.map((r) => (
            <div
              key={r.n}
              className="flex items-center gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-3"
            >
              <span className={`h-9 w-9 shrink-0 rounded-lg ${r.g}`} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-bold text-white">{r.n}</div>
                <div className="text-[11px] font-semibold text-white/40">{r.v}</div>
              </div>
              <span className="flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-extrabold uppercase text-emerald-300">
                <IconKey className="h-3 w-3" />
                Ready
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] py-2.5 text-[11px] font-bold text-white/45">
          <IconBolt className="h-3.5 w-3.5 text-gold-400" />
          Delivered in under 3 seconds
        </div>
      </div>
    </div>
  );
}
