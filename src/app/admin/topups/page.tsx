import PageHead from "@/components/admin/PageHead";
import DemoBanner from "@/components/admin/DemoBanner";
import ActionForm from "@/components/admin/ActionForm";
import StatusBadge from "@/components/StatusBadge";
import { IconCheck, IconX } from "@/components/Icons";
import { adminTopups } from "@/lib/admin-data";
import { money } from "@/lib/auth";
import { isDemo } from "@/lib/demo";
import { approveTopup, rejectTopup } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminTopupsPage() {
  const topups = await adminTopups();
  const pending = topups.filter((t: any) => t.status === "pending");

  return (
    <>
      <PageHead
        title="Wallet top-ups"
        subtitle={`${pending.length} awaiting review · approving credits the wallet instantly`}
      />

      <div className="space-y-5 p-5 sm:p-8">
        {isDemo && <DemoBanner />}

        <div className="card overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead className="border-b border-white/8">
              <tr>
                <th className="th">User</th>
                <th className="th">Amount</th>
                <th className="th">Method</th>
                <th className="th">Reference</th>
                <th className="th">Date</th>
                <th className="th">Status</th>
                <th className="th text-right">Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6">
              {topups.map((t: any) => (
                <tr key={t.id} className="hover:bg-white/[0.02]">
                  <td className="td font-bold text-white">{t.user}</td>
                  <td className="td text-[15px] font-extrabold text-gold-400">
                    {money(t.amount)}
                  </td>
                  <td className="td">{t.method}</td>
                  <td className="td">
                    <code className="text-[12px] text-white/60">{t.tx_ref || "—"}</code>
                  </td>
                  <td className="td whitespace-nowrap text-[12.5px] text-white/50">
                    {new Date(t.created_at).toLocaleDateString()}
                  </td>
                  <td className="td"><StatusBadge status={t.status} /></td>
                  <td className="td">
                    {t.status === "pending" ? (
                      <div className="flex items-center justify-end gap-2">
                        <ActionForm
                          action={approveTopup}
                          confirm={`Credit ${money(t.amount)} to ${t.user}?`}
                        >
                          <input type="hidden" name="id" value={t.id} />
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/12 px-3 py-1.5 text-[12px] font-bold text-emerald-300 transition hover:bg-emerald-500/20"
                          >
                            <IconCheck className="h-3.5 w-3.5" />
                            Approve
                          </button>
                        </ActionForm>

                        <ActionForm action={rejectTopup} confirm="Reject this top-up?">
                          <input type="hidden" name="id" value={t.id} />
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/25 bg-rose-500/12 px-3 py-1.5 text-[12px] font-bold text-rose-300 transition hover:bg-rose-500/20"
                          >
                            <IconX className="h-3.5 w-3.5" />
                            Reject
                          </button>
                        </ActionForm>
                      </div>
                    ) : (
                      <div className="text-right text-[12px] font-semibold text-white/30">
                        Reviewed
                      </div>
                    )}
                  </td>
                </tr>
              ))}

              {topups.length === 0 && (
                <tr>
                  <td className="td py-12 text-center text-white/45" colSpan={7}>
                    No top-up requests yet.
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
