import PageHead from "@/components/admin/PageHead";
import DemoBanner from "@/components/admin/DemoBanner";
import ActionForm from "@/components/admin/ActionForm";
import StatusBadge from "@/components/StatusBadge";
import { IconTrash, IconPlus, IconKey } from "@/components/Icons";
import { adminKeys, adminProducts } from "@/lib/admin-data";
import { isDemo } from "@/lib/demo";
import { addKeys, deleteKey } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminKeysPage() {
  const [keys, products] = await Promise.all([adminKeys(), adminProducts()]);

  const available = keys.filter((k: any) => k.status === "available").length;
  const sold = keys.filter((k: any) => k.status === "sold").length;

  return (
    <>
      <PageHead
        title="Key vault"
        subtitle={`${available} available · ${sold} delivered`}
      />

      <div className="space-y-6 p-5 sm:p-8">
        {isDemo && <DemoBanner />}

        {/* Bulk add */}
        <ActionForm
          action={addKeys}
          successText="Keys added to the vault."
          className="card p-6 sm:p-7"
        >
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gold-500/12 text-gold-400 ring-1 ring-gold-500/20">
              <IconKey className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-[15px] font-bold text-white">Load keys</h2>
              <p className="text-[12px] text-white/45">
                Paste one key per line — up to 1000 at a time.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="product_id">Product</label>
              <select id="product_id" name="product_id" className="input" required>
                <option value="" className="bg-ink-900">Select a product…</option>
                {products.map((p: any) => (
                  <option key={p.id} value={p.id} className="bg-ink-900">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="variant_id">Duration option</label>
              <select id="variant_id" name="variant_id" className="input">
                <option value="" className="bg-ink-900">Any / not specific</option>
                {products.flatMap((p: any) =>
                  (p.variants ?? []).map((v: any) => (
                    <option key={v.id} value={v.id} className="bg-ink-900">
                      {p.name} — {v.label}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="label" htmlFor="keys">Keys</label>
            <textarea
              id="keys"
              name="keys"
              rows={6}
              required
              className="input resize-y font-mono text-[12.5px]"
              placeholder={"DRIP-30D-A91F-88C2\nDRIP-30D-2B7C-0E41\nDRIP-30D-77D9-A0B3"}
            />
          </div>

          <button type="submit" className="btn-gold mt-5">
            <IconPlus className="h-3.5 w-3.5" />
            Add to vault
          </button>
        </ActionForm>

        {/* Inventory */}
        <div className="card overflow-x-auto">
          <div className="border-b border-white/8 px-5 py-4">
            <h2 className="text-[15px] font-bold text-white">Inventory</h2>
          </div>
          <table className="w-full min-w-[700px]">
            <thead className="border-b border-white/8">
              <tr>
                <th className="th">Key</th>
                <th className="th">Product</th>
                <th className="th">Option</th>
                <th className="th">Status</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6">
              {keys.map((k: any) => (
                <tr key={k.id} className="hover:bg-white/[0.02]">
                  <td className="td">
                    <code className="text-[12.5px] font-bold tracking-wider text-gold-400">
                      {k.key_value}
                    </code>
                  </td>
                  <td className="td text-white/80">{k.product}</td>
                  <td className="td text-white/55">{k.variant}</td>
                  <td className="td"><StatusBadge status={k.status} /></td>
                  <td className="td">
                    <div className="flex justify-end">
                      {k.status === "available" ? (
                        <ActionForm action={deleteKey} confirm="Delete this unused key?">
                          <input type="hidden" name="id" value={k.id} />
                          <button
                            type="submit"
                            aria-label="Delete key"
                            className="grid h-8 w-8 place-items-center rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-300 transition hover:bg-rose-500/20"
                          >
                            <IconTrash className="h-3.5 w-3.5" />
                          </button>
                        </ActionForm>
                      ) : (
                        <span className="text-[11.5px] font-semibold text-white/25">
                          Locked
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {keys.length === 0 && (
                <tr>
                  <td className="td py-12 text-center text-white/45" colSpan={5}>
                    Vault is empty — load some keys above.
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
