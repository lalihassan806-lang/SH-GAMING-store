"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { IconBox, IconCheck, IconPlus } from "@/components/Icons";
import {
  fetchSupplierProducts,
  importSupplierProduct,
  importAllSupplierProducts,
} from "@/app/admin/actions";

/**
 * Imports products from the supplier's catalogue into our database.
 *
 * This is the piece that was missing: the supplier's API is only a catalogue we
 * read, so until a product exists in OUR products table it cannot appear on the
 * storefront no matter what the API returns.
 *
 * Prices are deliberately NOT imported. The supplier quotes USD and this store
 * sells in PKR at the owner's own margin, so every imported product arrives at
 * Rs 0 and hidden, and must be priced before it can go live.
 */

const DEVELOPER_FEE_PERCENT = 1;

/** Duplicated from lib/drip.ts on purpose — that module reads DRIP_API_KEY and
 *  must never be pulled into a client bundle. */
function costWithFeeUsd(priceUsd: string | number): string {
  const p = Number(priceUsd) || 0;
  return (p * (1 + DEVELOPER_FEE_PERCENT / 100)).toFixed(2);
}

type Sku = {
  apiCode: string;
  label: string;
  priceUsd: string;
  days: number | null;
  inStock: boolean;
};

type SupplierProduct = {
  productApiCode: string;
  name: string;
  category: string | null;
  imageUrl: string | null;
  slug: string;
  imported: boolean;
  skus: Sku[];
};

export default function SupplierImport({
  supplierEnabled = true,
  isDemo = false,
}: {
  /** False when DRIP_API_KEY is missing on the server. */
  supplierEnabled?: boolean;
  isDemo?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [products, setProducts] = useState<SupplierProduct[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [q, setQ] = useState("");

  function load() {
    setError(null);
    setNote(null);
    startTransition(async () => {
      const res = await fetchSupplierProducts();
      if (res.ok) setProducts((res.products ?? []) as SupplierProduct[]);
      else setError(res.error || "Could not load the supplier catalogue.");
    });
  }

  async function importOne(p: SupplierProduct) {
    setError(null);
    setNote(null);
    setBusy(p.productApiCode);

    const fd = new FormData();
    fd.set("product_api_code", p.productApiCode);
    const res = await importSupplierProduct(fd);

    if (res.ok) {
      setNote(`"${p.name}" imported. Set its prices, then switch it live.`);
      // Reflects the new "Imported" state without a second API round trip.
      setProducts((list) =>
        (list ?? []).map((x) =>
          x.productApiCode === p.productApiCode ? { ...x, imported: true } : x
        )
      );
      router.refresh();
    } else {
      setError(res.error || "Import failed.");
    }
    setBusy(null);
  }

  async function importAll() {
    setError(null);
    setNote(null);
    setBusy("__all__");

    const res = await importAllSupplierProducts();
    if (res.ok) {
      setNote(
        `${res.added ?? 0} product${res.added === 1 ? "" : "s"} imported${
          res.skipped ? `, ${res.skipped} already there` : ""
        }. All are hidden until you set prices.`
      );
      setProducts((list) => (list ?? []).map((x) => ({ ...x, imported: true })));
      router.refresh();
    } else {
      setError(res.error || "Import failed.");
    }
    setBusy(null);
  }

  // Nothing can be loaded without a server-side key, so say so instead of
  // offering a button that always fails.
  const blocked = isDemo || !supplierEnabled;

  const needle = q.trim().toLowerCase();
  const shown = (products ?? []).filter(
    (p) =>
      !needle ||
      p.name?.toLowerCase().includes(needle) ||
      p.productApiCode?.toLowerCase().includes(needle)
  );
  const remaining = (products ?? []).filter((p) => !p.imported).length;

  return (
    <div className="card p-6 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-[15px] font-bold text-white">
            <IconBox className="h-4 w-4 text-gold-400" />
            Import from supplier
          </h2>
          <p className="mt-1 max-w-xl text-[12.5px] text-white/45">
            Brings the supplier&apos;s products in with a duration option and SKU
            for each. Prices are not imported — everything arrives hidden at
            Rs&nbsp;0 so you can set your own margin first.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {blocked && (
            <span className="badge shrink-0 border border-amber-500/25 bg-amber-500/12 text-amber-300">
              {isDemo ? "Demo mode" : "API key missing"}
            </span>
          )}
          {!blocked && products && remaining > 0 && (
            <button
              type="button"
              onClick={importAll}
              disabled={!!busy || pending}
              className="btn-gold btn-sm whitespace-nowrap"
            >
              {busy === "__all__" ? "Importing…" : `Import all (${remaining})`}
            </button>
          )}
          <button
            type="button"
            onClick={load}
            disabled={pending || !!busy || blocked}
            className="btn-ghost btn-sm whitespace-nowrap disabled:opacity-40"
          >
            {pending ? "Loading…" : products ? "Refresh" : "Load supplier products"}
          </button>
        </div>
      </div>

      {blocked && (
        <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-[12.5px] font-medium text-amber-200">
          {isDemo
            ? "Demo mode is on because Supabase is not configured. Importing needs a real database."
            : "DRIP_API_KEY is not set on the server. Add it in your hosting project's environment variables (all environments), redeploy, then reload this page."}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-[12.5px] font-medium text-rose-200"
        >
          {error}
        </div>
      )}

      {note && (
        <div
          role="status"
          className="mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-[12.5px] font-medium text-emerald-200"
        >
          {note}
        </div>
      )}

      {products && products.length > 0 && (
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="input mt-4"
          placeholder="Search supplier products…"
          aria-label="Search supplier products"
        />
      )}

      {products && (
        <div className="mt-4 max-h-[30rem] space-y-2 overflow-y-auto pr-1">
          {shown.map((p) => (
            <div
              key={p.productApiCode}
              className="flex items-start justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3"
            >
              <div className="flex min-w-0 gap-3">
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.imageUrl}
                    alt=""
                    className="h-11 w-11 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <span className="h-11 w-11 shrink-0 rounded-lg grad-orange" />
                )}

                <div className="min-w-0">
                  <div className="truncate text-[13px] font-bold text-white">
                    {p.name}
                  </div>
                  <div className="mt-0.5 truncate font-mono text-[11px] text-gold-300/80">
                    {p.productApiCode}
                  </div>
                  <div className="mt-0.5 text-[11px] font-semibold text-white/40">
                    {p.skus.length} duration{p.skus.length === 1 ? "" : "s"} · cost $
                    {costWithFeeUsd(p.skus[0]?.priceUsd ?? 0)}–$
                    {costWithFeeUsd(p.skus[p.skus.length - 1]?.priceUsd ?? 0)}
                  </div>
                </div>
              </div>

              {p.imported ? (
                <span className="badge shrink-0 border border-emerald-500/25 bg-emerald-500/12 text-emerald-300">
                  <IconCheck className="h-3 w-3" />
                  Imported
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => importOne(p)}
                  disabled={!!busy}
                  className="btn-ghost btn-sm shrink-0"
                >
                  {busy === p.productApiCode ? (
                    "Importing…"
                  ) : (
                    <>
                      <IconPlus className="h-3.5 w-3.5" />
                      Import
                    </>
                  )}
                </button>
              )}
            </div>
          ))}

          {shown.length === 0 && (
            <p className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-5 text-center text-[12.5px] text-white/40">
              {products.length === 0
                ? "The supplier returned no products for your account."
                : "No product matches that search."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
