import { createClient } from "@/lib/supabase/server";
import {
  isDemo,
  demoProducts,
  demoFaqs,
  demoPaymentMethods,
  demoStats,
  type DemoProduct,
} from "@/lib/demo";

export type Product = DemoProduct;

/** Products for the storefront grid. */
export async function getProducts(): Promise<Product[]> {
  if (isDemo) return demoProducts.filter((p) => p.active);

  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("*, product_variants(id,label,price,active,sort), license_keys(id,status)")
    .eq("active", true)
    .order("sort", { ascending: true });

  return (data ?? []).map(mapProduct);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  if (isDemo) return demoProducts.find((p) => p.slug === slug) ?? null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("*, product_variants(id,label,price,active,sort), license_keys(id,status)")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  return data ? mapProduct(data) : null;
}

export async function getFaqs() {
  if (isDemo) return demoFaqs;

  const supabase = await createClient();
  const { data } = await supabase
    .from("faqs")
    .select("id,question,answer")
    .eq("active", true)
    .order("sort", { ascending: true });

  return data ?? [];
}

export async function getPaymentMethods() {
  if (isDemo) return demoPaymentMethods;

  const supabase = await createClient();
  const { data } = await supabase
    .from("payment_methods")
    .select("id,name,account_name,account_no,instructions,icon,active")
    .eq("active", true)
    .order("sort", { ascending: true });

  return data ?? [];
}

/** Public counters shown in the hero + stat band. */
export async function getStoreStats() {
  if (isDemo) return demoStats;

  const supabase = await createClient();
  const [orders, products, keys, members] = await Promise.all([
    supabase.from("orders").select("id", { count: "exact", head: true }),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("active", true),
    supabase.from("license_keys").select("id", { count: "exact", head: true }).eq("status", "available"),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
  ]);

  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const { count: soldToday } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since.toISOString());

  // Revenue counts delivered orders only, so pending and cancelled orders
  // never inflate the figure. Summed in JS because PostgREST has no SUM().
  const { data: paid } = await supabase
    .from("orders")
    .select("total")
    .eq("status", "delivered");

  const revenue = (paid ?? []).reduce(
    (sum: number, o: any) => sum + Number(o.total ?? 0),
    0
  );

  return {
    orders: orders.count ?? 0,
    products: products.count ?? 0,
    keysReady: keys.count ?? 0,
    members: members.count ?? 0,
    soldToday: soldToday ?? 0,
    revenue,
  };
}

/* ---------------------------------------------------------------- */

function mapProduct(row: any): Product {
  const keys = row.license_keys ?? [];
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    tag: row.tag ?? "",
    description: row.description ?? "",
    price: Number(row.price ?? 0),
    old_price: row.old_price != null ? Number(row.old_price) : null,
    gradient: row.gradient ?? "orange",
    image_url: row.image_url || null,
    fulfilment: row.fulfilment === "vault" ? "vault" : "supplier",
    active: !!row.active,
    featured: !!row.featured,
    stock: keys.filter((k: any) => k.status === "available").length,
    variants: (row.product_variants ?? [])
      .filter((v: any) => v.active !== false)
      .sort((a: any, b: any) => (a.sort ?? 0) - (b.sort ?? 0))
      .map((v: any) => ({ id: v.id, label: v.label, price: Number(v.price) })),
  };
}

export function compact(n: number) {
  if (n >= 1000) {
    const k = n / 1000;
    return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}K+`;
  }
  return `${n}+`;
}
