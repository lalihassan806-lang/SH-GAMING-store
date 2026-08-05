const MAP: Record<string, string> = {
  delivered: "bg-emerald-500/12 text-emerald-300 border border-emerald-500/25",
  paid: "bg-emerald-500/12 text-emerald-300 border border-emerald-500/25",
  approved: "bg-emerald-500/12 text-emerald-300 border border-emerald-500/25",
  available: "bg-emerald-500/12 text-emerald-300 border border-emerald-500/25",
  active: "bg-emerald-500/12 text-emerald-300 border border-emerald-500/25",
  pending: "bg-gold-500/12 text-gold-400 border border-gold-500/25",
  reserved: "bg-gold-500/12 text-gold-400 border border-gold-500/25",
  cancelled: "bg-rose-500/12 text-rose-300 border border-rose-500/25",
  rejected: "bg-rose-500/12 text-rose-300 border border-rose-500/25",
  banned: "bg-rose-500/12 text-rose-300 border border-rose-500/25",
  disabled: "bg-white/8 text-white/45 border border-white/12",
  sold: "bg-sky-500/12 text-sky-300 border border-sky-500/25",
  refunded: "bg-violet-500/12 text-violet-300 border border-violet-500/25",
  admin: "bg-violet-500/12 text-violet-300 border border-violet-500/25",
  user: "bg-white/8 text-white/55 border border-white/12",
};

export default function StatusBadge({ status }: { status: string }) {
  const key = (status || "").toLowerCase();
  return (
    <span className={`badge ${MAP[key] ?? MAP.user}`}>{status}</span>
  );
}
