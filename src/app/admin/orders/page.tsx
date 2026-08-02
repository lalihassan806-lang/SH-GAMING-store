import { createClient } from "@/lib/supabase/server";
import { OrderRow } from "./order-row";
import type { Order } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  const orders = (data || []) as Order[];

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Orders ({orders.length})</h2>
      {orders.length === 0 ? (
        <p className="text-sm text-muted-foreground">No orders yet.</p>
      ) : (
        <div className="space-y-2">
          {orders.map((o) => (
            <OrderRow key={o.id} order={o} />
          ))}
        </div>
      )}
    </section>
  );
}
