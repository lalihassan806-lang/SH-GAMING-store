import Link from "next/link";
import { IconBolt } from "./Icons";

export default function DemoNotice({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="card p-8 text-center sm:p-10">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gold-500/12 text-gold-400 ring-1 ring-gold-500/20">
        <IconBolt className="h-5 w-5" />
      </span>
      <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-white">
        {title}
      </h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/55">
        {body}
      </p>
      <div className="mt-6 inline-flex flex-wrap justify-center gap-2.5">
        <Link href="/products" className="btn-gold btn-sm">
          Browse products
        </Link>
        <Link href="/admin" className="btn-ghost btn-sm">
          Preview admin panel
        </Link>
      </div>
      <p className="mt-6 text-[11.5px] font-semibold uppercase tracking-widest text-white/30">
        Demo mode — Supabase not connected
      </p>
    </div>
  );
}
