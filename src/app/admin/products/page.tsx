import Link from "next/link";
import PageHead from "@/components/admin/PageHead";
import DemoBanner from "@/components/admin/DemoBanner";
import ActionForm from "@/components/admin/ActionForm";
import StatusBadge from "@/components/StatusBadge";
import { IconPlus, IconTrash, IconKey } from "@/components/Icons";
import { adminProducts } from "@/lib/admin-data";
import { money } from "@/lib/auth";
import { isDemo } from "@/lib/demo";
import { deleteProduct, toggleProduct } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const products = await adminProducts();

  return (
    <>
      <PageHead
        title="Products"
        subtitle={`${products.length} listing${products.length === 1 ? "" : "s"} in the catalog`}
        action={
          <Link href="/admin/products/new" className="btn-gold btn-sm">
            <IconPlus className="h-3.5 w-3.5" />
            Add product
          </Link>
        }
      />

      <div className="space-y-5 p-5 sm:p-8">
        {isDemo && <DemoBanner />}

        <div className="card overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead className="border-b border-white/8">
              <tr>
                <th className="th">Product</th>
                <th className="th">Price</th>
                <th className="th">Variants</th>
                <th className="th">Stock</th>
                <th className="th">Status</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6">
              {products.map((p: any) => (
                <tr key={p.id} className="hover:bg-white/[0.02]">
                  <td className="td">
                    <div className="flex items-center gap-3">
                      <span className={`h-10 w-10 shrink-0 rounded-lg grad-${p.gradient || "orange"}`} />
                      <div className="min-w-0">
                        <div className="truncate font-bold text-white">{p.name}</div>
                        <div className="truncate text-[11px] font-semibold uppercase tracking-wider text-white/35">
                          {p.tag || p.slug}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="td">
                    <div className="font-bold text-white">{money(p.price)}</div>
                    {p.old_price ? (
                      <div className="text-[11.5px] text-white/30 line-through">
                        {money(p.old_price)}
                      </div>
                    ) : null}
                  </td>
                  <td className="td">
                    <div className="flex flex-wrap gap-1">
                      {(p.variants ?? []).slice(0, 3).map((v: any) => (
                        <span
                          key={v.id}
                          className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10.5px] font-bold text-white/55"
                        >
                          {v.label}
                        </span>
                      ))}
                      {(p.variants ?? []).length === 0 && (
                        <span className="text-[12px] text-white/30">none</span>
                      )}
                    </div>
                  </td>
                  <td className="td">
                    <span
                      className={`inline-flex items-center gap-1.5 font-bold ${
                        p.stock > 10
                          ? "text-emerald-300"
                          : p.stock > 0
                          ? "text-gold-400"
                          : "text-rose-300"
                      }`}
                    >
                      <IconKey className="h-3.5 w-3.5" />
                      {p.stock}
                    </span>
                  </td>
                  <td className="td">
                    <StatusBadge status={p.active ? "active" : "disabled"} />
                  </td>
                  <td className="td">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/products/${p.id}`} className="btn-ghost btn-sm">
                        Edit
                      </Link>

                      <ActionForm action={toggleProduct}>
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="active" value={String(!!p.active)} />
                        <button type="submit" className="btn-ghost btn-sm">
                          {p.active ? "Hide" : "Show"}
                        </button>
                      </ActionForm>

                      <ActionForm
                        action={deleteProduct}
                        confirm={`Delete "${p.name}"? Its keys and variants will be removed too.`}
                      >
                        <input type="hidden" name="id" value={p.id} />
                        <button
                          type="submit"
                          aria-label="Delete product"
                          className="grid h-8 w-8 place-items-center rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-300 transition hover:bg-rose-500/20"
                        >
                          <IconTrash className="h-3.5 w-3.5" />
                        </button>
                      </ActionForm>
                    </div>
                  </td>
                </tr>
              ))}

              {products.length === 0 && (
                <tr>
                  <td className="td py-12 text-center text-white/45" colSpan={6}>
                    No products yet.{" "}
                    <Link href="/admin/products/new" className="font-bold text-gold-400">
                      Add your first one
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
