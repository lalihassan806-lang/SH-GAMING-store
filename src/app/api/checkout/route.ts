import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isDemo } from "@/lib/demo";

export async function POST(request: Request) {
  if (isDemo) {
    return NextResponse.json(
      { error: "Demo mode: Supabase is not configured." },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const items = Array.isArray(body?.items) ? body.items : [];
  if (items.length === 0) {
    return NextResponse.json({ error: "EMPTY_CART" }, { status: 400 });
  }

  // Only pass through fields the DB function expects. Prices are resolved
  // server-side inside checkout_with_wallet — the client cannot set them.
  const clean = items.slice(0, 20).map((i: any) => ({
    product_id: String(i.product_id),
    variant_id: i.variant_id ? String(i.variant_id) : null,
    qty: Math.min(10, Math.max(1, Number(i.qty) || 1)),
  }));

  const { data, error } = await supabase.rpc("checkout_with_wallet", {
    p_items: clean,
    p_note: null,
  });

  if (error) {
    const msg = error.message || "Checkout failed";
    const status = /INSUFFICIENT_FUNDS|OUT_OF_STOCK|EMPTY_CART/.test(msg) ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }

  return NextResponse.json({ order: data });
}
