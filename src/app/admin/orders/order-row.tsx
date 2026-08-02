"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { updateOrderStatusAction } from "@/app/actions/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatPKR } from "@/lib/utils";
import type { Order } from "@/lib/supabase/types";

const statusVariant: Record<Order["status"], any> = {
  pending: "warning",
  paid: "success",
  delivered: "success",
  cancelled: "danger"
};

export function OrderRow({ order }: { order: Order }) {
  const [pending, start] = useTransition();

  return (
    <form
      action={(fd) =>
        start(async () => {
          const res = await updateOrderStatusAction(fd);
          if (res && "error" in res && res.error) toast.error(res.error);
          else toast.success("Updated");
        })
      }
      className="rounded-xl border border-border bg-card/60 p-3 text-sm"
    >
      <input type="hidden" name="id" value={order.id} />

      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <p className="font-medium">{order.product_title}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(order.created_at).toLocaleString()} ·{" "}
            {order.payment_method.toUpperCase()} · TID{" "}
            <span className="font-mono">{order.txn_id}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Buyer: {order.buyer_name} · {order.buyer_contact} ·{" "}
            {order.buyer_email}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="font-semibold drip-gradient-text">
            {formatPKR(Number(order.amount))}
          </span>
          <Badge variant={statusVariant[order.status]}>{order.status}</Badge>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <select
          name="status"
          defaultValue={order.status}
          className="h-9 rounded-md border border-input bg-transparent px-2 text-xs"
        >
          <option value="pending">pending</option>
          <option value="paid">paid</option>
          <option value="delivered">delivered</option>
          <option value="cancelled">cancelled</option>
        </select>
        <Input
          name="admin_note"
          defaultValue={order.admin_note || ""}
          placeholder="Admin note (optional)"
          className="min-w-[180px] flex-1"
        />
        <Button type="submit" size="sm" variant="gradient" disabled={pending}>
          {pending ? "Saving…" : "Update"}
        </Button>
      </div>
    </form>
  );
}
