import Link from "next/link";
import { IconArrow, IconKey } from "./Icons";
import { money } from "@/lib/auth";

export type CardProduct = {
  id: string;
  name: string;
  slug: string;
  tag?: string | null;
  price: number;
  old_price?: number | null;
  gradient?: string | null;
  stock?: number;
};

export default function ProductCard({ p }: { p: CardProduct }) {
  const grad = `grad-${p.gradient || "orange"}`;
  const off =
    p.old_price && p.old_price > p.price
      ? Math.round(((p.old_price - p.price) / p.old_price) * 100)
      : null;

  return (
    <Link href={`/products/${p.slug}`} className="card card-hover group block overflow-hidden">
      {/* Cover */}
      <div className={`relative aspect-[16/10] ${grad}`}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_20%_20%,rgba(255,255,255,.55),transparent_45%)]" />

        {p.tag && (
          <span className="absolute left-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-white/90 backdrop-blur">
            {p.tag}
          </span>
        )}
        {off && (
          <span className="absolute right-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-extrabold text-emerald-300 backdrop-blur">
            -{off}%
          </span>
        )}

        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-lg font-extrabold leading-tight tracking-tight text-white drop-shadow">
            {p.name}
          </h3>
        </div>
      </div>

      {/* Body */}
      <div className="flex items-center justify-between gap-3 p-4">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-extrabold text-white">{money(p.price)}</span>
            {p.old_price && p.old_price > p.price && (
              <span className="text-xs font-semibold text-white/35 line-through">
                {money(p.old_price)}
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-white/45">
            <IconKey className="h-3.5 w-3.5" />
            {typeof p.stock === "number"
              ? p.stock > 0
                ? `${p.stock} keys ready`
                : "Out of stock"
              : "In stock"}
          </div>
        </div>

        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold-grad text-black shadow-gold transition group-hover:scale-110">
          <IconArrow className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}
