export default function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent = "gold",
}: {
  label: string;
  value: string;
  sub?: string;
  icon: (p: { className?: string }) => React.ReactElement;
  accent?: "gold" | "emerald" | "violet" | "cyan";
}) {
  const ring = {
    gold: "bg-gold-500/12 text-gold-400 ring-gold-500/20",
    emerald: "bg-emerald-500/12 text-emerald-300 ring-emerald-500/20",
    violet: "bg-violet-500/12 text-violet-300 ring-violet-500/20",
    cyan: "bg-cyan-500/12 text-cyan-300 ring-cyan-500/20",
  }[accent];

  return (
    <div className="card card-hover p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-widest text-white/40">
            {label}
          </div>
          <div className="mt-2 truncate text-3xl font-extrabold tracking-tight text-white">
            {value}
          </div>
          {sub && (
            <div className="mt-1.5 text-[11.5px] font-semibold text-white/35">
              {sub}
            </div>
          )}
        </div>
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ring-1 ${ring}`}>
          <Icon className="h-[18px] w-[18px]" />
        </span>
      </div>
    </div>
  );
}
