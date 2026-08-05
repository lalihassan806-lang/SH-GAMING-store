import Link from "next/link";
import PageHead from "@/components/admin/PageHead";
import StatCard from "@/components/admin/StatCard";
import SalesChart from "@/components/admin/SalesChart";
import StatusBadge from "@/components/StatusBadge";
import DemoBanner from "@/components/admin/DemoBanner";
import { IconChart, IconCart, IconUsers, IconKey, IconWallet, IconArrow } from "@/components/Icons";
import { adminDashboard } from "@/lib/admin-data";
import { money } from "@/lib/auth";
import { isDemo } from "@/lib/demo";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const d = await adminDashboard();

  return (
    <>
      <PageHead
        title="Dashboard"
        subtitle="Live overview of sales, stock and pending actions."
        action={
          <Link href="/admin/products/new" className="btn-gold btn-sm">
            Add product
          </Link>
        }
      />

      <div className="space-y-6 p-5 sm:p-8">
        {isDemo && <DemoBanner />}

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Revenue"
            value={money(d.revenue)}
            sub="Paid + delivered"
            icon={IconChart}
            accent="gold"
          />
          <StatCard
            label="Orders"
            value={d.orders.toLocaleString()}
            sub="All time"
            icon={IconCart}
            accent="emerald"
          />
          <StatCard
            label="Members"
            value={d.members.toLocaleString()}
            sub="Registered users"
            icon={IconUsers}
            accent="violet"
          />
          <StatCard
            label="Keys ready"
            value={d.keysReady.toLocaleString()}
            sub="Available in vault"
            icon={IconKey}
            accent="cyan"
          />
        </div>

        {/* Action alerts */}
        {(d.pendingTopups > 0 || d.lowStock > 0) && (
          <div className="grid gap-4 sm:grid-cols-2">
            {d.pendingTopups > 0 && (
              <Link
                href="/admin/topups"
                className="card card-hover flex items-center gap-4 p-5"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gold-500/12 text-gold-400 ring-1 ring-gold-500/20">
                  <IconWallet className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-bold text-white">
                    {d.pendingTopups} top-up{d.pendingTopups > 1 ? "s" : ""} awaiting approval
                  </div>
                  <div className="text-[12px] text-white/45">
                    Approve to credit wallets instantly
                  </div>
                </div>
                <IconArrow className="h-4 w-4 shrink-0 text-white/30" />
              </Link>
            )}

            {d.lowStock > 0 && (
              <Link href="/admin/keys" className="card card-hover flex items-center gap-4 p-5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-rose-500/12 text-rose-300 ring-1 ring-rose-500/20">
                  <IconKey className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-bold text-white">
                    {d.lowStock} product{d.lowStock > 1 ? "s" : ""} low on keys
                  </div>
                  <div className="text-[12px] text-white/45">
                    Restock before they sell out
                  </div>
                </div>
                <IconArrow className="h-4 w-4 shrink-0 text-white/30" />
              </Link>
            )}
          </div>
        )}

        <SalesChart series={d.series} />

        {/* Recent tables */}
        <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
              <h2 className="text-[15px] font-bold text-white">Recent orders</h2>
              <Link href="/admin/orders" className="text-[12px] font-bold text-gold-400 hover:text-gold-500">
                View all
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px]">
                <thead className="border-b border-white/8">
                  <tr>
                    <th className="th">Order</th>
                    <th className="th">User</th>
                    <th className="th">Total</th>
                    <th className="th">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/6">
                  {d.recentOrders.map((o: any) => (
                    <tr key={o.id} className="hover:bg-white/[0.02]">
                      <td className="td font-bold text-white">{o.order_no}</td>
                      <td className="td">{o.user}</td>
                      <td className="td font-bold">{money(o.total)}</td>
                      <td className="td"><StatusBadge status={o.status} /></td>
                    </tr>
                  ))}
                  {d.recentOrders.length === 0 && (
                    <tr>
                      <td className="td py-8 text-center text-white/45" colSpan={4}>
                        No orders yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
              <h2 className="text-[15px] font-bold text-white">Latest top-ups</h2>
              <Link href="/admin/topups" className="text-[12px] font-bold text-gold-400 hover:text-gold-500">
                Manage
              </Link>
            </div>
            <div className="divide-y divide-white/6">
              {d.recentTopups.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <div className="truncate text-[13.5px] font-bold text-white">
                      {money(t.amount)}
                    </div>
                    <div className="truncate text-[11.5px] font-semibold text-white/40">
                      {t.user} · {t.method}
                    </div>
                  </div>
                  <StatusBadge status={t.status} />
                </div>
              ))}
              {d.recentTopups.length === 0 && (
                <div className="px-5 py-8 text-center text-sm text-white/45">
                  No top-ups yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
