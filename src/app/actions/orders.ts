"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

const orderSchema = z.object({
  product_id: z.string().uuid(),
  payment_method: z.enum(["jazzcash", "easypaisa"]),
  txn_id: z.string().min(3).max(64),
  buyer_name: z.string().min(2).max(80),
  buyer_contact: z.string().min(7).max(20)
});

export async function createOrderAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { error: "Please sign in to place an order." };

  const parsed = orderSchema.safeParse({
    product_id: formData.get("product_id"),
    payment_method: formData.get("payment_method"),
    txn_id: formData.get("txn_id"),
    buyer_name: formData.get("buyer_name"),
    buyer_contact: formData.get("buyer_contact")
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Invalid form" };

  // Fetch product for amount + title (never trust client-supplied price).
  const { data: product, error: pErr } = await supabase
    .from("products")
    .select("id, title, price, is_active")
    .eq("id", parsed.data.product_id)
    .maybeSingle();
  if (pErr || !product || !product.is_active) {
    return { error: "Product unavailable" };
  }

  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      user_id: user.id,
      product_id: product.id,
      product_title: product.title,
      amount: product.price,
      payment_method: parsed.data.payment_method,
      txn_id: parsed.data.txn_id,
      buyer_name: parsed.data.buyer_name,
      buyer_contact: parsed.data.buyer_contact,
      buyer_email: user.email
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/orders");
  return { ok: true, id: order.id };
}
