"use client";

import { useState, useTransition } from "react";
import { IconBox, IconCheck } from "@/components/Icons";
import { fetchSupplierCatalog } from "@/app/admin/actions";

type Sku = {
  apiCode: string;
  name: string;
  product: string;
  label: string | null;
  days: number | null;
  priceUsd: string;
  stock: number;
  inStock: boolean;
};

/**
 * Read-only browser for the supplier's SKU list.
 *
 * Loads on demand rather than on render: the panel sits on every product edit
 * page, and hitting the supplier API on each page view would be wasteful and
 * would make the page fail whenever the supplier is down.
 *
 * Nothing here writes to our database. Importing SKUs automatically would also
 * import supplier prices, and the owner sets retail prices by hand.
 */
export default function SupplierCatalog() {
  const [pending, startTransition] = useTransition();
  const [skus, setSkus] = useState<Sku[] | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [q, setQ] = useState("");

  function load() {
    setError(null);
    startTransition(async () => {
      const res = await fetchSupplierCatalog();
      if (res.ok) {
        setSkus((res.skus ?? []) as Sku[]);
        setBalance(res.balanceUsd ?? null);
      } else {
        setError(res.error || "Could not load the supplier catalogue.");
      }
    });
  }

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied((c) => (c === code ? null : c)), 1500);
    } catch {
      // Clipboard is blocked on insecure origins — the code is on screen
      // anyway, so a silent no-op is better than an alarming error.
    }
  }

  const needle = q.trim().toLowerCase();
  const shown = (skus ?? []).filter(
    (s) =>
      !needle ||
      s.apiCode?.toLowerCase().includes(needle) ||
      s.name?.toLowerCase().includes(needle) ||
      s.product?.toLowerCase().includes(needle)
  );

  return (
    <div className="card p-6 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-[15px] font-bold text-white">
            <IconBox className="h-4 w-4 text-gold-400" />
            Supplier catalogue
          </h2>
          <p className="mt-1 text-[12.5px] text-white/45">
            Copy a SKU from here into the duration option above.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {balance && (
            <span className="badge border border-emerald-500/25 bg-emerald-500/12 text-emerald-300">
              Deposit ${balance}
            </span>
          )}
          <button
            type="button"
            onClick={load}
            disabled={pending}
            className="btn-ghost btn-sm whitespace-nowrap"
          >
            {pending ? "Loading…" : skus ? "Refresh" : "Load catalogue"}
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-[12.5px] font-medium text-rose-200"
        >
          {error}
        </div>
      )}

      {skus && skus.length > 0 && (
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="input mt-4"
          placeholder="Search by name or SKU…"
        />
      )}

      {skus && (
        <div className="mt-4 max-h-96 space-y-2 overflow-y-auto pr-1">
          {shown.map((s) => (
            <div
              key={s.apiCode}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3"
            >
              <div className="min-w-0">
                <div className="truncate text-[13px] font-bold text-white">
                  {s.product} · {s.label || s.name}
                </div>
                <div className="mt-0.5 truncate font-mono text-[11px] text-gold-300/80">
                  {s.apiCode}
                </div>
                <div className="mt-0.5 text-[11px] font-semibold text-white/40">
                  ${s.priceUsd} cost
                  {s.inStock ? (
                    <span className="text-emerald-300/70"> · {s.stock} in stock</span>
                  ) : (
                    <span className="text-rose-300/80"> · out of stock</span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => copy(s.apiCode)}
                className="btn-ghost btn-sm shrink-0"
              >
                {copied === s.apiCode ? (
                  <>
                    <IconCheck className="h-3.5 w-3.5 text-emerald-300" />
                    Copied
                  </>
                ) : (
                  "Copy SKU"
                )}
              </button>
            </div>
          ))}

          {shown.length === 0 && (
            <p className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-5 text-center text-[12.5px] text-white/40">
              {skus.length === 0
                ? "The supplier returned no products for your account."
                : "No SKU matches that search."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
