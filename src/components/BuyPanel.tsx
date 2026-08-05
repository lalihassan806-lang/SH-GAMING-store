"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { IconArrow, IconWallet, IconKey } from "./Icons";
import type { DemoProduct } from "@/lib/demo";

function fmt(n: number) {
  return `Rs ${Number(n || 0).toLocaleString("en-PK")}`;
}

export default function BuyPanel({
  product,
  walletBalance,
  loggedIn,
  demo,
}: {
  product: DemoProduct;
  walletBalance: number | null;
  loggedIn: boolean;
  demo: boolean;
}) {
  const router = useRouter();
  const [variantId, setVariantId] = useState(
    product.variants[1]?.id ?? product.variants[0]?.id ?? ""
  );
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "err" | "ok"; text: string } | null>(null);

  const variant = useMemo(
    () => product.variants.find((v) => v.id === variantId),
    [product.variants, variantId]
  );
  const unit = variant?.price ?? product.price;
  const total = unit * qty;
  const outOfStock = product.stock <= 0;
  const notEnough = walletBalance != null && walletBalance < total;

  async function buy() {
    setMsg(null);

    if (demo) {
      setMsg({
        type: "err",
        text: "Demo mode — connect Supabase to place real orders.",
      });
      return;
    }
    if (!loggedIn) {
      router.push(`/login?next=/products/${product.slug}`);
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ product_id: product.id, variant_id: variantId || null, qty }],
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Checkout failed");

      router.push(`/account/orders/${json.order.id}?new=1`);
    } catch (e: any) {
      setMsg({ type: "err", text: friendly(e?.message) });
      setBusy(false);
    }
  }

  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <div className="card p-6 shadow-card">
        {/* Price */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-widest text-white/40">
              Total price
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold tracking-tight text-white">
                {fmt(total)}
              </span>
              {product.old_price && product.old_price > product.price && (
                <span className="text-sm font-semibold text-white/30 line-through">
                  {fmt(product.old_price * qty)}
                </span>
              )}
            </div>
          </div>
          <span
            className={`badge ${
              outOfStock
                ? "border border-rose-500/25 bg-rose-500/12 text-rose-300"
                : "border border-emerald-500/25 bg-emerald-500/12 text-emerald-300"
            }`}
          >
            {outOfStock ? "Out of stock" : "In stock"}
          </span>
        </div>

        {/* Variants */}
        {product.variants.length > 0 && (
          <div className="mt-6">
            <div className="label">Duration</div>
            <div className="grid grid-cols-3 gap-2">
              {product.variants.map((v) => {
                const on = v.id === variantId;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVariantId(v.id)}
                    className={`rounded-xl border px-3 py-3 text-center transition ${
                      on
                        ? "border-gold-500/60 bg-gold-500/12 text-white"
                        : "border-white/10 bg-white/[0.03] text-white/60 hover:border-white/25"
                    }`}
                  >
                    <div className="text-[13px] font-extrabold">{v.label}</div>
                    <div className="mt-0.5 text-[11px] font-semibold opacity-60">
                      {fmt(v.price)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Quantity */}
        <div className="mt-5">
          <div className="label">Quantity</div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-lg font-bold text-white/70 transition hover:border-white/25"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="min-w-10 text-center text-lg font-extrabold text-white">
              {qty}
            </span>
            <button
              type="button"
              onClick={() => setQty((q) => Math.min(10, q + 1))}
              className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-lg font-bold text-white/70 transition hover:border-white/25"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        </div>

        {/* Wallet line */}
        <div className="mt-6 flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3">
          <span className="flex items-center gap-2 text-[12.5px] font-bold text-white/55">
            <IconWallet className="h-4 w-4 text-gold-400" />
            Wallet balance
          </span>
          <span className="text-[13px] font-extrabold text-white">
            {walletBalance == null ? "—" : fmt(walletBalance)}
          </span>
        </div>

        {msg && (
          <div
            role="alert"
            className={`mt-4 rounded-xl border px-4 py-3 text-[13px] font-medium ${
              msg.type === "err"
                ? "border-rose-500/25 bg-rose-500/10 text-rose-200"
                : "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
            }`}
          >
            {msg.text}
          </div>
        )}

        {/* Actions */}
        <button
          type="button"
          onClick={buy}
          disabled={busy || outOfStock}
          className="btn-gold mt-5 w-full justify-center"
        >
          {busy
            ? "Processing…"
            : !loggedIn
            ? "Login & Buy"
            : notEnough
            ? "Top up & Buy"
            : "Buy now"}
          {!busy && (
            <span className="grid h-5 w-5 place-items-center rounded-full bg-black/20">
              <IconArrow className="h-3 w-3" />
            </span>
          )}
        </button>

        {notEnough && (
          <Link href="/wallet" className="btn-ghost mt-2.5 w-full justify-center">
            <IconWallet className="h-4 w-4" />
            Top up wallet
          </Link>
        )}

        <p className="mt-4 flex items-center justify-center gap-1.5 text-[11.5px] font-semibold text-white/35">
          <IconKey className="h-3.5 w-3.5" />
          Key delivered to your vault instantly
        </p>
      </div>
    </aside>
  );
}

function friendly(m?: string) {
  if (!m) return "Checkout failed. Please try again.";
  if (m.includes("INSUFFICIENT_FUNDS"))
    return "Not enough wallet balance. Top up and try again.";
  if (m.includes("OUT_OF_STOCK")) return "This product just sold out.";
  if (m.includes("AUTH_REQUIRED")) return "Please log in to continue.";
  return m;
}
