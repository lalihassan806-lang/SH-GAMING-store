import { IconBolt, IconKey, IconWallet } from "./Icons";

/** Decorative wallet/vault preview card shown beside the hero copy. */
export default function WalletMock() {
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
                Rs 2,480
              </div>
            </div>
            <span className="rounded-full bg-black/15 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider">
              Active
            </span>
          </div>
          <div className="relative mt-5 flex items-center justify-between text-[11px] font-bold">
            <span className="opacity-70">•••• 4821</span>
            <span className="opacity-70">SH GAMING</span>
          </div>
        </div>

        {/* Vault rows */}
        <div className="mt-4 space-y-2.5">
          {[
            { n: "DRIP CLIENT", v: "30 Days", g: "grad-orange" },
            { n: "HG CHEATS", v: "7 Days", g: "grad-purple" },
            { n: "DRIP CLIENT PROXY", v: "30 Days", g: "grad-cyan" },
          ].map((r) => (
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
