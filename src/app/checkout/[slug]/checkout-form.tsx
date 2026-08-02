"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createOrderAction } from "@/app/actions/orders";

export function CheckoutForm({ productId }: { productId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <form
      action={(fd) =>
        start(async () => {
          const res = await createOrderAction(fd);
          if (res && "error" in res && res.error) {
            toast.error(res.error);
          } else if (res?.ok) {
            toast.success("Order placed — waiting for verification.");
            router.push("/orders");
          }
        })
      }
      className="space-y-3 rounded-2xl border border-border bg-card/60 p-4"
    >
      <input type="hidden" name="product_id" value={productId} />

      <div className="space-y-1">
        <Label>Payment method</Label>
        <div className="flex gap-2">
          <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/10">
            <input type="radio" name="payment_method" value="jazzcash" defaultChecked className="accent-primary" />
            JazzCash
          </label>
          <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/10">
            <input type="radio" name="payment_method" value="easypaisa" className="accent-primary" />
            EasyPaisa
          </label>
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="txn_id">Transaction ID (TID)</Label>
        <Input id="txn_id" name="txn_id" required placeholder="e.g. 1234567890" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="buyer_name">Your name</Label>
        <Input id="buyer_name" name="buyer_name" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="buyer_contact">Your WhatsApp / phone</Label>
        <Input id="buyer_contact" name="buyer_contact" required placeholder="03XXXXXXXXX" />
      </div>

      <Button type="submit" variant="gradient" className="w-full" disabled={pending}>
        {pending ? "Submitting…" : "Submit order"}
      </Button>
      <p className="text-[11px] text-muted-foreground">
        By submitting you agree to wait for manual payment verification.
      </p>
    </form>
  );
}
