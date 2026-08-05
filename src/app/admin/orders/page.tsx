import PageHead from "@/components/admin/PageHead";
import DemoBanner from "@/components/admin/DemoBanner";
import ActionForm from "@/components/admin/ActionForm";
import StatusBadge from "@/components/StatusBadge";
import { adminOrders } from "@/lib/admin-data";
import { money } from "@/lib/auth";
import { isDemo } from "@/lib/demo";
import { setOrderStatus } from "../actions";

export const dynamic = "force-dynamic";

const STATUSES = ["pending", "paid", "delivered", "cancelled", "refunded"];

export default async function AdminOrdersPage() {
  const orders = await adminOrders();

  const totals = orders.reduce(
    (acc: any, o: any) => {
      acc.count += 1;
      if (["paid", "delivered"].includes(o.status)) acc.revenue += Number(o.total || 0);
      if (o.status === "pending") acc.pending += 1;
      return acc;
    },
    { count: 0, revenue: 0, pending: 0 }
  );

  return (
    <>
      <PageHead
        title="Orders"
        subtitle={`${totals.count} orders · ${money(totals.revenue)} collected · ${totals.pending} pending`}
      />

      <div className="space-y-5 p-5 sm:p-8">
        {isDemo && <DemoBanner />}

        <div className="card overflow-x-auto">
          <table className="w-full min-w-[880px]">
            <thead className="border-b border-white/8">
              <tr>
                <th className="th">Order</th>
                <th className="th">User</th>
                <th className="th">Item</th>
                <th className="th">Method</th>
                <th className="th">Total</th>
                <th className="th">Date</th>
                <th className="th">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6">
              {orders.map((o: any) => (
                <tr key={o.id} className="hover:bg-white/[0.02]">
                  <td className="td font-bold text-white">{o.order_no}</td>
                  <td className="td">{o.user}</td>
                  <td className="td">
                    <div className="text-white/80">{o.product}</div>
                    {o.variant && (
                      <div className="text-[11.5px] text-white/35">{o.variant}</div>
                    )}
                  </td>
                  <td className="td capitalize">{o.method}</td>
                  <td className="td font-bold text-white">{money(o.total)}</td>
                  <td className="td whitespace-nowrap text-[12.5px] text-white/50">
                    {new Date(o.created_at).toLocaleDateString()}
                  </td>
                  <td className="td">
                    <ActionForm action={setOrderStatus} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={o.id} />
                      <select
                        name="status"
                        defaultValue={o.status}
                        className="rounded-lg border border-white/10 bg-ink-900 px-2.5 py-1.5 text-[12px] font-bold text-white outline-none focus:border-gold-500/60"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s} className="bg-ink-900 capitalize">
                            {s}
                          </option>
                        ))}
                      </select>
                      <button type="submit" className="btn-ghost btn-sm">
                        Save
                      </button>
                    </ActionForm>
                  </td>
                </tr>
              ))}

              {orders.length === 0 && (
                <tr>
                  <td className="td py-12 text-center text-white/45" colSpan={7}>
                    No orders yet.
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
