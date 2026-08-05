import Link from "next/link";
import { notFound } from "next/navigation";
import PageHead from "@/components/admin/PageHead";
import DemoBanner from "@/components/admin/DemoBanner";
import ProductForm from "@/components/admin/ProductForm";
import ActionForm from "@/components/admin/ActionForm";
import { IconTrash, IconPlus } from "@/components/Icons";
import { adminProducts } from "@/lib/admin-data";
import { money } from "@/lib/auth";
import { isDemo } from "@/lib/demo";
import { saveVariant, deleteVariant } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const products = await adminProducts();
  const product = products.find((p: any) => p.id === id);
  if (!product) notFound();

  return (
    <>
      <PageHead
        title={product.name}
        subtitle="Edit details, pricing and duration options."
        action={
          <Link href="/admin/products" className="btn-ghost btn-sm">
            Back to products
          </Link>
        }
      />

      <div className="max-w-3xl space-y-6 p-5 sm:p-8">
        {isDemo && <DemoBanner />}

        <ProductForm product={product} />

        {/* Variants */}
        <div className="card p-6 sm:p-7">
          <h2 className="text-[15px] font-bold text-white">Duration options</h2>
          <p className="mt-1 text-[12.5px] text-white/45">
            Each option gets its own price. Buyers pick one at checkout.
          </p>

          <div className="mt-5 space-y-2">
            {(product.variants ?? []).map((v: any) => (
              <div
                key={v.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3"
              >
                <div>
                  <div className="text-[13.5px] font-bold text-white">{v.label}</div>
                  <div className="text-[11.5px] font-semibold text-white/40">
                    {money(v.price)}
                  </div>
                </div>
                <ActionForm action={deleteVariant} confirm={`Remove "${v.label}"?`}>
                  <input type="hidden" name="id" value={v.id} />
                  <button
                    type="submit"
                    aria-label="Remove option"
                    className="grid h-8 w-8 place-items-center rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-300 transition hover:bg-rose-500/20"
                  >
                    <IconTrash className="h-3.5 w-3.5" />
                  </button>
                </ActionForm>
              </div>
            ))}

            {(product.variants ?? []).length === 0 && (
              <p className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-5 text-center text-[12.5px] text-white/40">
                No duration options — the base price will be used.
              </p>
            )}
          </div>

          <ActionForm action={saveVariant} successText="Option added." className="mt-5">
            <input type="hidden" name="product_id" value={product.id} />
            <div className="grid gap-3 sm:grid-cols-[1.2fr_1fr_1fr_auto]">
              <input
                name="label"
                className="input"
                placeholder="30 Days"
                required
                maxLength={40}
              />
              <input
                name="price"
                type="number"
                min={0}
                step="1"
                className="input"
                placeholder="Price"
                required
              />
              <input
                name="duration_days"
                type="number"
                min={0}
                className="input"
                placeholder="Days"
              />
              <button type="submit" className="btn-gold whitespace-nowrap">
                <IconPlus className="h-3.5 w-3.5" />
                Add
              </button>
            </div>
          </ActionForm>
        </div>

        {/* Stock shortcut */}
        <div className="card flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <div className="text-[15px] font-bold text-white">
              {product.stock} keys available
            </div>
            <p className="mt-1 text-[12.5px] text-white/45">
              Load more keys so buyers can check out.
            </p>
          </div>
          <Link href="/admin/keys" className="btn-gold btn-sm">
            Manage key vault
          </Link>
        </div>
      </div>
    </>
  );
}
