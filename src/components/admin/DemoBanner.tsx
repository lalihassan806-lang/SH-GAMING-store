import { IconBolt } from "@/components/Icons";

export default function DemoBanner() {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gold-500/25 bg-gold-500/[0.07] p-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gold-500/15 text-gold-400">
        <IconBolt className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-bold text-gold-300">
          Demo mode — showing sample data
        </div>
        <div className="text-[12px] text-white/45">
          Add your Supabase keys to <code className="text-gold-400">.env.local</code> and run{" "}
          <code className="text-gold-400">supabase/schema.sql</code> to go live. Every
          screen then reads and writes real records.
        </div>
      </div>
    </div>
  );
}
