"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return { supabase, error: "Not signed in" };
  const { data } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!data?.is_admin) return { supabase, error: "Not authorized" };
  return { supabase, error: null };
}

const productSchema = z.object({
  title: z.string().min(2).max(120),
  description: z.string().max(4000).optional().nullable(),
  price: z.coerce.number().min(0),
  image_url: z.string().url().optional().nullable(),
  demo_url: z.string().url().optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  is_active: z.coerce.boolean().default(true)
});

export async function upsertProductAction(formData: FormData) {
  const { supabase, error } = await assertAdmin();
  if (error) return { error };

  const id = String(formData.get("id") || "");
  const parsed = productSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || null,
    price: formData.get("price"),
    image_url: formData.get("image_url") || null,
    demo_url: formData.get("demo_url") || null,
    category_id: formData.get("category_id") || null,
    is_active: formData.get("is_active") === "on"
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Invalid" };

  const payload = {
    ...parsed.data,
    slug: slugify(parsed.data.title) + (id ? "" : "-" + Math.random().toString(36).slice(2, 6)),
    updated_at: new Date().toISOString()
  };

  const q = id
    ? supabase!.from("products").update(payload).eq("id", id)
    : supabase!.from("products").insert(payload);

  const { error: err } = await q;
  if (err) return { error: err.message };
  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteProductAction(formData: FormData) {
  const { supabase, error } = await assertAdmin();
  if (error) return { error };
  const id = String(formData.get("id") || "");
  const { error: err } = await supabase!.from("products").delete().eq("id", id);
  if (err) return { error: err.message };
  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true };
}

const statusSchema = z.enum(["pending", "paid", "delivered", "cancelled"]);

export async function updateOrderStatusAction(formData: FormData) {
  const { supabase, error } = await assertAdmin();
  if (error) return { error };
  const id = String(formData.get("id") || "");
  const status = statusSchema.safeParse(formData.get("status"));
  if (!status.success) return { error: "Invalid status" };
  const note = (formData.get("admin_note") as string) || null;
  const { error: err } = await supabase!
    .from("orders")
    .update({ status: status.data, admin_note: note, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (err) return { error: err.message };
  revalidatePath("/admin/orders");
  return { ok: true };
}
