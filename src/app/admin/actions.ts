"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isDemo } from "@/lib/demo";

/** Every action re-checks the admin role server-side before touching data. */
async function assertAdmin() {
  if (isDemo) throw new Error("DEMO_MODE");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("AUTH_REQUIRED");

  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (data?.role !== "admin") throw new Error("FORBIDDEN");
  return { supabase, userId: user.id };
}

type Result = { ok: boolean; error?: string };

function fail(e: unknown): Result {
  const m = e instanceof Error ? e.message : "Unknown error";
  if (m === "DEMO_MODE")
    return { ok: false, error: "Demo mode — connect Supabase to save changes." };
  return { ok: false, error: m };
}

const str = (v: FormDataEntryValue | null, max = 300) =>
  String(v ?? "").trim().slice(0, max);
const num = (v: FormDataEntryValue | null) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

/**
 * Accept only absolute http(s) image URLs.
 * Rejecting other schemes matters: a `javascript:` or `data:` value stored here
 * would be rendered straight into an img src on the public storefront.
 */
const imageUrl = (v: FormDataEntryValue | null): string | null => {
  const raw = String(v ?? "").trim().slice(0, 500);
  if (!raw) return null;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error("Image URL is not valid. Paste a full https:// link.");
  }
  if (u.protocol !== "https:" && u.protocol !== "http:")
    throw new Error("Image URL must start with https://");
  return u.toString();
};

/* ------------------------------ PRODUCTS ------------------------------ */

export async function saveProduct(formData: FormData): Promise<Result> {
  try {
    const { supabase } = await assertAdmin();

    const id = str(formData.get("id"));
    const name = str(formData.get("name"), 120);
    if (!name) throw new Error("Product name is required.");

    const row = {
      name,
      slug: str(formData.get("slug"), 60) || slugify(name),
      tag: str(formData.get("tag"), 60),
      description: str(formData.get("description"), 2000),
      price: num(formData.get("price")),
      old_price: formData.get("old_price") ? num(formData.get("old_price")) : null,
      gradient: str(formData.get("gradient"), 20) || "orange",
      image_url: imageUrl(formData.get("image_url")),
      active: formData.get("active") === "on",
      featured: formData.get("featured") === "on",
      sort: num(formData.get("sort")),
    };

    const { error } = id
      ? await supabase.from("products").update(row).eq("id", id)
      : await supabase.from("products").insert(row);

    if (error) throw new Error(error.message);

    revalidatePath("/admin/products");
    revalidatePath("/products");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteProduct(formData: FormData): Promise<Result> {
  try {
    const { supabase } = await assertAdmin();
    const id = str(formData.get("id"));
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) throw new Error(error.message);

    revalidatePath("/admin/products");
    revalidatePath("/products");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function toggleProduct(formData: FormData): Promise<Result> {
  try {
    const { supabase } = await assertAdmin();
    const id = str(formData.get("id"));
    const active = str(formData.get("active")) === "true";
    const { error } = await supabase.from("products").update({ active: !active }).eq("id", id);
    if (error) throw new Error(error.message);

    revalidatePath("/admin/products");
    revalidatePath("/products");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------------ VARIANTS ------------------------------ */

export async function saveVariant(formData: FormData): Promise<Result> {
  try {
    const { supabase } = await assertAdmin();
    const row = {
      product_id: str(formData.get("product_id")),
      label: str(formData.get("label"), 40),
      price: num(formData.get("price")),
      duration_days: formData.get("duration_days") ? num(formData.get("duration_days")) : null,
      sort: num(formData.get("sort")),
    };
    if (!row.label) throw new Error("Variant label is required.");

    const { error } = await supabase.from("product_variants").insert(row);
    if (error) throw new Error(error.message);

    revalidatePath("/admin/products");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteVariant(formData: FormData): Promise<Result> {
  try {
    const { supabase } = await assertAdmin();
    const { error } = await supabase
      .from("product_variants")
      .delete()
      .eq("id", str(formData.get("id")));
    if (error) throw new Error(error.message);

    revalidatePath("/admin/products");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------------ KEYS ------------------------------ */

/** Bulk-add keys, one per line. */
export async function addKeys(formData: FormData): Promise<Result> {
  try {
    const { supabase } = await assertAdmin();

    const product_id = str(formData.get("product_id"));
    const variant_id = str(formData.get("variant_id")) || null;
    if (!product_id) throw new Error("Pick a product first.");

    const keys = String(formData.get("keys") ?? "")
      .split(/\r?\n/)
      .map((k) => k.trim())
      .filter(Boolean)
      .slice(0, 1000);

    if (keys.length === 0) throw new Error("Paste at least one key.");

    const { error } = await supabase.from("license_keys").insert(
      keys.map((key_value) => ({ product_id, variant_id, key_value }))
    );
    if (error) throw new Error(error.message);

    revalidatePath("/admin/keys");
    revalidatePath("/admin/products");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteKey(formData: FormData): Promise<Result> {
  try {
    const { supabase } = await assertAdmin();
    const { error } = await supabase
      .from("license_keys")
      .delete()
      .eq("id", str(formData.get("id")))
      .eq("status", "available"); // never delete a delivered key
    if (error) throw new Error(error.message);

    revalidatePath("/admin/keys");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------------ TOP-UPS ------------------------------ */

export async function approveTopup(formData: FormData): Promise<Result> {
  try {
    const { supabase } = await assertAdmin();
    const { error } = await supabase.rpc("approve_topup", {
      p_topup_id: str(formData.get("id")),
      p_note: str(formData.get("note"), 200) || null,
    });
    if (error) throw new Error(error.message);

    revalidatePath("/admin/topups");
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function rejectTopup(formData: FormData): Promise<Result> {
  try {
    const { supabase } = await assertAdmin();
    const { error } = await supabase
      .from("topups")
      .update({
        status: "rejected",
        admin_note: str(formData.get("note"), 200),
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", str(formData.get("id")))
      .eq("status", "pending");
    if (error) throw new Error(error.message);

    revalidatePath("/admin/topups");
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------------ ORDERS ------------------------------ */

export async function setOrderStatus(formData: FormData): Promise<Result> {
  try {
    const { supabase } = await assertAdmin();
    const status = str(formData.get("status"), 20);
    if (!["pending", "paid", "delivered", "cancelled", "refunded"].includes(status)) {
      throw new Error("Invalid status.");
    }

    const { error } = await supabase
      .from("orders")
      .update({
        status,
        delivered_at: status === "delivered" ? new Date().toISOString() : null,
      })
      .eq("id", str(formData.get("id")));
    if (error) throw new Error(error.message);

    revalidatePath("/admin/orders");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------------ USERS ------------------------------ */

export async function adjustWallet(formData: FormData): Promise<Result> {
  try {
    const { supabase } = await assertAdmin();

    const user_id = str(formData.get("user_id"));
    const delta = num(formData.get("amount"));
    if (!user_id || delta === 0) throw new Error("Enter an amount.");

    const { data: prof, error: readErr } = await supabase
      .from("profiles")
      .select("wallet")
      .eq("id", user_id)
      .single();
    if (readErr) throw new Error(readErr.message);

    const next = Number(prof.wallet) + delta;
    if (next < 0) throw new Error("Balance cannot go below zero.");

    const { error } = await supabase
      .from("profiles")
      .update({ wallet: next })
      .eq("id", user_id);
    if (error) throw new Error(error.message);

    await supabase.from("wallet_txns").insert({
      user_id,
      amount: delta,
      kind: "adjust",
      note: str(formData.get("note"), 200) || "Manual adjustment by admin",
    });

    revalidatePath("/admin/users");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function setUserRole(formData: FormData): Promise<Result> {
  try {
    const { supabase, userId } = await assertAdmin();

    const target = str(formData.get("user_id"));
    const role = str(formData.get("role"), 10);
    if (!["user", "admin"].includes(role)) throw new Error("Invalid role.");
    if (target === userId) throw new Error("You cannot change your own role.");

    const { error } = await supabase.from("profiles").update({ role }).eq("id", target);
    if (error) throw new Error(error.message);

    revalidatePath("/admin/users");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function setUserBanned(formData: FormData): Promise<Result> {
  try {
    const { supabase, userId } = await assertAdmin();

    const target = str(formData.get("user_id"));
    if (target === userId) throw new Error("You cannot ban yourself.");

    const banned = str(formData.get("banned")) === "true";
    const { error } = await supabase
      .from("profiles")
      .update({ banned: !banned })
      .eq("id", target);
    if (error) throw new Error(error.message);

    revalidatePath("/admin/users");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/* ------------------------------ PAYMENTS / FAQ / SETTINGS ------------------------------ */

export async function savePaymentMethod(formData: FormData): Promise<Result> {
  try {
    const { supabase } = await assertAdmin();

    const id = str(formData.get("id"));
    const row = {
      name: str(formData.get("name"), 60),
      account_name: str(formData.get("account_name"), 80),
      account_no: str(formData.get("account_no"), 120),
      instructions: str(formData.get("instructions"), 500),
      active: formData.get("active") === "on",
      sort: num(formData.get("sort")),
    };
    if (!row.name) throw new Error("Method name is required.");

    const { error } = id
      ? await supabase.from("payment_methods").update(row).eq("id", id)
      : await supabase.from("payment_methods").insert(row);
    if (error) throw new Error(error.message);

    revalidatePath("/admin/payments");
    revalidatePath("/wallet");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deletePaymentMethod(formData: FormData): Promise<Result> {
  try {
    const { supabase } = await assertAdmin();
    const { error } = await supabase
      .from("payment_methods")
      .delete()
      .eq("id", str(formData.get("id")));
    if (error) throw new Error(error.message);

    revalidatePath("/admin/payments");
    revalidatePath("/wallet");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function saveFaq(formData: FormData): Promise<Result> {
  try {
    const { supabase } = await assertAdmin();

    const id = str(formData.get("id"));
    const row = {
      question: str(formData.get("question"), 200),
      answer: str(formData.get("answer"), 1000),
      sort: num(formData.get("sort")),
      active: formData.get("active") === "on",
    };
    if (!row.question || !row.answer) throw new Error("Question and answer are required.");

    const { error } = id
      ? await supabase.from("faqs").update(row).eq("id", id)
      : await supabase.from("faqs").insert(row);
    if (error) throw new Error(error.message);

    revalidatePath("/admin/faqs");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteFaq(formData: FormData): Promise<Result> {
  try {
    const { supabase } = await assertAdmin();
    const { error } = await supabase.from("faqs").delete().eq("id", str(formData.get("id")));
    if (error) throw new Error(error.message);

    revalidatePath("/admin/faqs");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function saveSettings(formData: FormData): Promise<Result> {
  try {
    const { supabase } = await assertAdmin();

    const value = {
      name: str(formData.get("name"), 80),
      currency: str(formData.get("currency"), 10) || "PKR",
      support_url: str(formData.get("support_url"), 200),
      announcement: str(formData.get("announcement"), 300),
    };

    const { error } = await supabase
      .from("settings")
      .upsert({ key: "store", value, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);

    revalidatePath("/admin/settings");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
