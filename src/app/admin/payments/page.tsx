import PageHead from "@/components/admin/PageHead";
import DemoBanner from "@/components/admin/DemoBanner";
import ActionForm from "@/components/admin/ActionForm";
import StatusBadge from "@/components/StatusBadge";
import { IconTrash, IconPlus } from "@/components/Icons";
import { adminPaymentMethods } from "@/lib/admin-data";
import { isDemo } from "@/lib/demo";
import { savePaymentMethod, deletePaymentMethod } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  const methods = await adminPaymentMethods();

  return (
    <>
      <PageHead
        title="Payment methods"
        subtitle="These accounts are shown to buyers on the wallet top-up page."
      />

      <div className="space-y-6 p-5 sm:p-8">
        {isDemo && <DemoBanner />}

        {/* Add new */}
        <ActionForm
          action={savePaymentMethod}
          successText="Payment method saved."
          className="card p-6 sm:p-7"
        >
          <h2 className="text-[15px] font-bold text-white">Add a method</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="name">Name</label>
              <input id="name" name="name" className="input" placeholder="JazzCash" required maxLength={60} />
            </div>
            <div>
              <label className="label" htmlFor="account_name">Account title</label>
              <input id="account_name" name="account_name" className="input" placeholder="SH GAMING" maxLength={80} />
            </div>
            <div>
              <label className="label" htmlFor="account_no">Account number / ID</label>
              <input id="account_no" name="account_no" className="input" placeholder="0300-0000000" maxLength={120} />
            </div>
            <div>
              <label className="label" htmlFor="sort">Sort order</label>
              <input id="sort" name="sort" type="number" className="input" defaultValue={0} />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="instructions">Instructions for buyers</label>
              <textarea
                id="instructions"
                name="instructions"
                rows={2}
                className="input resize-y"
                placeholder="Send the exact amount, then submit the TID."
                maxLength={500}
              />
            </div>
          </div>

          <label className="mt-5 flex cursor-pointer items-center gap-2.5">
            <input type="checkbox" name="active" defaultChecked className="h-4 w-4 accent-gold-500" />
            <span className="text-[13px] font-bold text-white/75">Show on wallet page</span>
          </label>

          <button type="submit" className="btn-gold mt-5">
            <IconPlus className="h-3.5 w-3.5" />
            Add method
          </button>
        </ActionForm>

        {/* Existing */}
        <div className="card overflow-x-auto">
          <div className="border-b border-white/8 px-5 py-4">
            <h2 className="text-[15px] font-bold text-white">Active methods</h2>
          </div>
          <table className="w-full min-w-[720px]">
            <thead className="border-b border-white/8">
              <tr>
                <th className="th">Method</th>
                <th className="th">Account</th>
                <th className="th">Instructions</th>
                <th className="th">Status</th>
                <th className="th text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6">
              {methods.map((m: any) => (
                <tr key={m.id} className="hover:bg-white/[0.02]">
                  <td className="td font-bold text-white">{m.name}</td>
                  <td className="td">
                    <code className="text-[12.5px] text-gold-400">{m.account_no || "—"}</code>
                    {m.account_name && (
                      <div className="text-[11.5px] text-white/35">{m.account_name}</div>
                    )}
                  </td>
                  <td className="td max-w-xs">
                    <span className="line-clamp-2 text-[12.5px] text-white/50">
                      {m.instructions || "—"}
                    </span>
                  </td>
                  <td className="td">
                    <StatusBadge status={m.active ? "active" : "disabled"} />
                  </td>
                  <td className="td">
                    <div className="flex justify-end">
                      <ActionForm action={deletePaymentMethod} confirm={`Remove ${m.name}?`}>
                        <input type="hidden" name="id" value={m.id} />
                        <button
                          type="submit"
                          aria-label="Remove method"
                          className="grid h-8 w-8 place-items-center rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-300 transition hover:bg-rose-500/20"
                        >
                          <IconTrash className="h-3.5 w-3.5" />
                        </button>
                      </ActionForm>
                    </div>
                  </td>
                </tr>
              ))}

              {methods.length === 0 && (
                <tr>
                  <td className="td py-12 text-center text-white/45" colSpan={5}>
                    No payment methods configured.
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
