import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { formatPKR } from "@/lib/utils";
import type { Order } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const statusVariant: Record<Order["status"], any> = {
  pending: "warning",
  paid: "success",
  delivered: "success",
  cancelled: "danger"
};

export default async function OrdersPage() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/orders");

  const { data } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const orders = (data || []) as Order[];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">My orders</h1>
      {orders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No orders yet.
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((o) => (
            <div
              key={o.id}
              className="flex items-center justify-between rounded-xl border border-border bg-card/60 p-3 text-sm"
            >
              <div>
                <p className="font-medium">{o.product_title}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(o.created_at).toLocaleString()} · {o.payment_method.toUpperCase()} · TID {o.txn_id}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="font-semibold drip-gradient-text">
                  {formatPKR(Number(o.amount))}
                </span>
                <Badge variant={statusVariant[o.status]}>{o.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
