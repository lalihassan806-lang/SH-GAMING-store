import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import SupportFab from "@/components/SupportFab";
import StatusBadge from "@/components/StatusBadge";
import { IconCheck, IconKey } from "@/components/Icons";
import { createClient } from "@/lib/supabase/server";
import { money, requireUser } from "@/lib/auth";
import { isDemo } from "@/lib/demo";

export const dynamic = "force-dynamic";

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  if (isDemo) notFound();

  const { id } = await params;
  const { new: isNew } = await searchParams;

  await requireUser(`/account/orders/${id}`);
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id,order_no,total,status,pay_method,created_at,delivered_at")
    .eq("id", id)
    .maybeSingle();

  if (!order) notFound();

  const { data: items } = await supabase
    .from("order_items")
    .select("id,product_name,variant_label,unit_price,qty,delivered_key")
    .eq("order_id", id);

  return (
    <>
      <div className="glow-field" />
      <div className="relative z-10">
        <SiteHeader />

        <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          {isNew && (
            <div className="mb-7 flex items-center gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-500/20 text-emerald-300">
                <IconCheck className="h-4 w-4" />
              </span>
              <div>
                <div className="text-[14px] font-bold text-emerald-200">
                  Order delivered
                </div>
                <div className="text-[12.5px] text-emerald-200/70">
                  Your keys are below and saved in your vault.
                </div>
              </div>
            </div>
          )}

          <div className="card p-6 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-white/40">
                  Order
                </div>
                <div className="mt-1 text-2xl font-extrabold tracking-tight text-white">
                  {order.order_no}
                </div>
                <div className="mt-1 text-[12px] text-white/40">
                  {new Date(order.created_at).toLocaleString()}
                </div>
              </div>
              <StatusBadge status={order.status} />
            </div>

            <div className="mt-7 space-y-3">
              {(items ?? []).map((i: any) => (
                <div key={i.id} className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-[14px] font-bold text-white">
                        {i.product_name}
                      </div>
                      <div className="text-[11.5px] font-semibold text-white/40">
                        {i.variant_label} · x{i.qty}
                      </div>
                    </div>
                    <span className="text-[14px] font-extrabold text-white">
                      {money(i.unit_price * i.qty)}
                    </span>
                  </div>

                  {i.delivered_key && (
                    <div className="mt-3 flex items-center gap-2 rounded-lg border border-gold-500/25 bg-gold-500/10 px-3 py-2">
                      <IconKey className="h-4 w-4 shrink-0 text-gold-400" />
                      <code className="break-all text-[13px] font-bold tracking-wider text-gold-400">
                        {i.delivered_key}
                      </code>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-white/8 pt-5">
              <span className="text-[13px] font-bold uppercase tracking-widest text-white/40">
                Total paid
              </span>
              <span className="text-2xl font-extrabold text-white">
                {money(order.total)}
              </span>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2.5">
            <Link href="/account" className="btn-ghost btn-sm">
              Back to vault
            </Link>
            <Link href="/products" className="btn-gold btn-sm">
              Buy another key
            </Link>
          </div>
        </main>

        <SiteFooter />
      </div>
      <SupportFab />
    </>
  );
}
