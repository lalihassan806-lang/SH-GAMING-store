import { createClient } from "@/lib/supabase/server";
import {
  isDemo, demoOrders, demoUsers, demoTopups, demoKeys,
  demoProducts, demoStats, demoSalesSeries, demoPaymentMethods, demoFaqs,
} from "@/lib/demo";

export async function adminDashboard() {
  if (isDemo) {
    return {
      revenue: demoStats.revenue,
      orders: demoStats.orders,
      members: demoStats.members,
      keysReady: demoStats.keysReady,
      pendingTopups: demoTopups.filter((t) => t.status === "pending").length,
      lowStock: demoProducts.filter((p) => p.stock < 10).length,
      series: demoSalesSeries,
      recentOrders: demoOrders.slice(0, 6),
      recentTopups: demoTopups.slice(0, 4),
    };
  }

  const supabase = await createClient();
  const [orders, members, keys, topups, paid] = await Promise.all([
    supabase.from("orders").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("license_keys").select("id", { count: "exact", head: true }).eq("status", "available"),
    supabase.from("topups").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("orders").select("total,created_at").in("status", ["paid", "delivered"]),
  ]);

  const rows = paid.data ?? [];
  const revenue = rows.reduce((s: number, r: any) => s + Number(r.total || 0), 0);

  // Last 14 days of revenue
  const series = Array.from({ length: 14 }, (_, i) => {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - (13 - i));
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    return rows
      .filter((r: any) => {
        const t = new Date(r.created_at).getTime();
        return t >= day.getTime() && t < next.getTime();
      })
      .reduce((s: number, r: any) => s + Number(r.total || 0), 0);
  });

  const { data: recentOrders } = await supabase
    .from("orders")
    .select("id,order_no,total,status,pay_method,created_at,profiles(username)")
    .order("created_at", { ascending: false })
    .limit(6);

  const { data: recentTopups } = await supabase
    .from("topups")
    .select("id,amount,method,status,created_at,profiles(username)")
    .order("created_at", { ascending: false })
    .limit(4);

  return {
    revenue,
    orders: orders.count ?? 0,
    members: members.count ?? 0,
    keysReady: keys.count ?? 0,
    pendingTopups: topups.count ?? 0,
    lowStock: 0,
    series,
    recentOrders: (recentOrders ?? []).map(flatOrder),
    recentTopups: (recentTopups ?? []).map((t: any) => ({
      ...t,
      user: t.profiles?.username ?? "—",
    })),
  };
}

export async function adminOrders() {
  if (isDemo) return demoOrders;

  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("id,order_no,total,status,pay_method,created_at,profiles(username),order_items(product_name,variant_label)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (data ?? []).map(flatOrder);
}

export async function adminUsers() {
  if (isDemo) return demoUsers;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id,username,email,role,wallet,banned,created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  return (data ?? []).map((u: any) => ({ ...u, orders: 0 }));
}

export async function adminTopups() {
  if (isDemo) return demoTopups;

  const supabase = await createClient();
  const { data } = await supabase
    .from("topups")
    .select("id,amount,method,tx_ref,sender_name,status,created_at,profiles(username)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (data ?? []).map((t: any) => ({ ...t, user: t.profiles?.username ?? "—" }));
}

export async function adminKeys() {
  if (isDemo) return demoKeys;

  const supabase = await createClient();
  const { data } = await supabase
    .from("license_keys")
    .select("id,key_value,status,created_at,products(name),product_variants(label)")
    .order("created_at", { ascending: false })
    .limit(200);

  return (data ?? []).map((k: any) => ({
    id: k.id,
    key_value: k.key_value,
    status: k.status,
    product: k.products?.name ?? "—",
    variant: k.product_variants?.label ?? "—",
  }));
}

export async function adminProducts() {
  if (isDemo) return demoProducts;

  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("*, product_variants(id,label,price), license_keys(id,status)")
    .order("sort", { ascending: true });

  return (data ?? []).map((p: any) => ({
    ...p,
    price: Number(p.price ?? 0),
    old_price: p.old_price != null ? Number(p.old_price) : null,
    stock: (p.license_keys ?? []).filter((k: any) => k.status === "available").length,
    variants: (p.product_variants ?? []).map((v: any) => ({
      id: v.id, label: v.label, price: Number(v.price),
    })),
  }));
}

export async function adminPaymentMethods() {
  if (isDemo) return demoPaymentMethods;

  const supabase = await createClient();
  const { data } = await supabase
    .from("payment_methods")
    .select("*")
    .order("sort", { ascending: true });
  return data ?? [];
}

export async function adminFaqs() {
  if (isDemo) return demoFaqs.map((f, i) => ({ ...f, sort: i + 1, active: true }));

  const supabase = await createClient();
  const { data } = await supabase
    .from("faqs")
    .select("*")
    .order("sort", { ascending: true });
  return data ?? [];
}

/* ---------------------------------------------------------------- */

function flatOrder(o: any) {
  const first = (o.order_items ?? [])[0];
  return {
    id: o.id,
    order_no: o.order_no,
    total: Number(o.total ?? 0),
    status: o.status,
    method: o.pay_method ?? "—",
    created_at: o.created_at,
    user: o.profiles?.username ?? "—",
    product: first?.product_name ?? "—",
    variant: first?.variant_label ?? "",
  };
}
