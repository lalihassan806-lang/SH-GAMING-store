import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import SupportFab from "@/components/SupportFab";
import StatusBadge from "@/components/StatusBadge";
import { IconWallet, IconKey, IconBox, IconLogout } from "@/components/Icons";
import { createClient } from "@/lib/supabase/server";
import { money, requireUser } from "@/lib/auth";
import { isDemo } from "@/lib/demo";
import DemoNotice from "@/components/DemoNotice";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  if (isDemo) {
    return (
      <>
        <div className="glow-field" />
        <div className="relative z-10">
          <SiteHeader />
          <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
            <DemoNotice
              title="Account vault"
              body="This page shows your wallet balance, order history and delivered keys. It needs a Supabase connection to load real data."
            />
          </main>
          <SiteFooter />
        </div>
        <SupportFab />
      </>
    );
  }

  const profile = await requireUser("/account");
  const supabase = await createClient();

  const [{ data: orders }, { data: items }] = await Promise.all([
    supabase
      .from("orders")
      .select("id,order_no,total,status,pay_method,created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("order_items")
      .select("id,product_name,variant_label,delivered_key,order_id")
      .limit(20),
  ]);

  const keys = (items ?? []).filter((i: any) => i.delivered_key);

  return (
    <>
      <div className="glow-field" />
      <div className="relative z-10">
        <SiteHeader />

        <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="pill">My Account</span>
              <h1 className="section-title mt-4">
                Hey {profile.username || "gamer"}
              </h1>
            </div>
            <form action="/logout" method="post">
              <button className="btn-ghost btn-sm" type="submit">
                <IconLogout className="h-4 w-4" />
                Log out
              </button>
            </form>
          </div>

          {/* Summary tiles */}
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="card p-6">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-white/40">
                <IconWallet className="h-4 w-4 text-gold-400" />
                Wallet
              </div>
              <div className="mt-2 text-3xl font-extrabold text-white">
                {money(profile.wallet)}
              </div>
              <Link href="/wallet" className="btn-gold btn-sm mt-4">
                Top up
              </Link>
            </div>

            <div className="card p-6">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-white/40">
                <IconBox className="h-4 w-4 text-gold-400" />
                Orders
              </div>
              <div className="mt-2 text-3xl font-extrabold text-white">
                {orders?.length ?? 0}
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-white/40">
                <IconKey className="h-4 w-4 text-gold-400" />
                Keys owned
              </div>
              <div className="mt-2 text-3xl font-extrabold text-white">
                {keys.length}
              </div>
            </div>
          </div>

          {/* Key vault */}
          <h2 className="mt-12 text-lg font-bold text-white">Your key vault</h2>
          <div className="card mt-4 divide-y divide-white/8">
            {keys.length === 0 && (
              <div className="p-8 text-center text-sm text-white/45">
                No keys yet.{" "}
                <Link href="/products" className="font-bold text-gold-400">
                  Browse products
                </Link>
              </div>
            )}
            {keys.map((k: any) => (
              <div key={k.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <div className="text-[14px] font-bold text-white">
                    {k.product_name}
                  </div>
                  <div className="text-[11.5px] font-semibold text-white/40">
                    {k.variant_label}
                  </div>
                </div>
                <code className="rounded-lg border border-gold-500/25 bg-gold-500/10 px-3 py-1.5 text-[12.5px] font-bold tracking-wider text-gold-400">
                  {k.delivered_key}
                </code>
              </div>
            ))}
          </div>

          {/* Orders */}
          <h2 className="mt-12 text-lg font-bold text-white">Recent orders</h2>
          <div className="card mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead className="border-b border-white/8">
                <tr>
                  <th className="th">Order</th>
                  <th className="th">Method</th>
                  <th className="th">Total</th>
                  <th className="th">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/6">
                {(orders ?? []).map((o: any) => (
                  <tr key={o.id} className="hover:bg-white/[0.02]">
                    <td className="td font-bold text-white">{o.order_no}</td>
                    <td className="td capitalize">{o.pay_method || "—"}</td>
                    <td className="td font-bold">{money(o.total)}</td>
                    <td className="td"><StatusBadge status={o.status} /></td>
                  </tr>
                ))}
                {(orders ?? []).length === 0 && (
                  <tr>
                    <td className="td py-8 text-center text-white/45" colSpan={4}>
                      No orders yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </main>

        <SiteFooter />
      </div>
      <SupportFab />
    </>
  );
}
