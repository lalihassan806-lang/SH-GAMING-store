import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isDemo } from "@/lib/demo";
import {
  createOrder,
  DripError,
  buyerMessage,
  supplierEnabled,
} from "@/lib/drip";

/**
 * Supplier-fulfilled checkout.
 *
 * The HTTP call to the supplier cannot happen inside a Postgres transaction —
 * a hung supplier would hold a row lock on the buyer's wallet. So the money
 * and the key are handled in three short steps:
 *
 *   1. reserve_order  debit the wallet, order = 'paid'
 *   2. supplier call  buy the key
 *   3. settle_order   attach key, order = 'delivered'
 *      refund_order   on any failure, money goes back, order = 'cancelled'
 *
 * The buyer is debited BEFORE the supplier is called. That ordering is
 * deliberate: it makes double-spend impossible. The cost of it is that a
 * failure needs a refund, which step 3 always performs.
 */
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

  // One SKU per order: the supplier's POST /orders takes a single sku, and
  // splitting a mixed basket across calls would need per-line refunds.
  const first = Array.isArray(body?.items) ? body.items[0] : body;
  const variantId = first?.variant_id ? String(first.variant_id) : null;
  const qty = Math.max(1, Math.min(50, Number(first?.qty) || 1));

  if (!variantId) {
    return NextResponse.json({ error: "VARIANT_REQUIRED" }, { status: 400 });
  }

  /* ---------- 1. reserve: debit wallet, create 'paid' order ---------- */
  const { data: order, error: reserveErr } = await supabase.rpc("reserve_order", {
    p_variant_id: variantId,
    p_qty: qty,
    p_note: null,
  });

  if (reserveErr || !order) {
    const msg = reserveErr?.message || "Checkout failed";
    const known =
      /INSUFFICIENT_FUNDS|VARIANT_UNAVAILABLE|PRODUCT_UNAVAILABLE|NO_SUPPLIER_SKU|NO_PROFILE/.test(
        msg
      );
    return NextResponse.json(
      { error: known ? msg.replace(/^.*?([A-Z_]+).*$/s, "$1") : "CHECKOUT_FAILED" },
      { status: known ? 400 : 500 }
    );
  }

  const orderId = (order as any).id as string;

  // Resolve the supplier SKU after reserving, so a config gap still leaves a
  // refundable order rather than an unexplained failure.
  const { data: variant } = await supabase
    .from("product_variants")
    .select("supplier_sku, products(fulfilment)")
    .eq("id", variantId)
    .single();

  const sku = (variant as any)?.supplier_sku as string | null;
  const fulfilment = (variant as any)?.products?.fulfilment ?? "supplier";

  async function refund(reason: string) {
    const { error } = await supabase.rpc("refund_order", {
      p_order_id: orderId,
      p_reason: reason,
    });
    // A failed refund is the worst outcome here: the buyer is out of pocket and
    // the order is stuck in 'paid'. Surfacing it lets an admin settle manually.
    return !error;
  }

  /**
   * Records the supplier attempt. Deliberately never throws: an audit write
   * failing must not turn a successful delivery into an error for the buyer.
   */
  async function log(
    status: "pending" | "fulfilled" | "failed" | "refunded",
    extra: { ref?: string | null; error?: string | null; cost?: number | null } = {}
  ) {
    try {
      await supabase.rpc("log_supplier_order", {
        p_order_id: orderId,
        p_sku: sku ?? "",
        p_quantity: qty,
        p_idem_key: orderId,
        p_status: status,
        p_ref: extra.ref ?? null,
        p_error: extra.error ?? null,
        p_cost: extra.cost ?? null,
      });
    } catch {
      /* audit only */
    }
  }

  if (fulfilment !== "supplier" || !sku) {
    const ok = await refund("Supplier SKU not configured");
    return NextResponse.json(
      {
        error: "UNAVAILABLE",
        message: "This item is not set up for instant delivery yet.",
        refunded: ok,
      },
      { status: 409 }
    );
  }

  if (!supplierEnabled) {
    const ok = await refund("Supplier API key not configured");
    return NextResponse.json(
      {
        error: "UNAVAILABLE",
        message: "Instant delivery is offline right now.",
        refunded: ok,
      },
      { status: 503 }
    );
  }

  /* ---------- 2. buy from supplier ---------- */
  let keys: string[];
  let supplierRef: string;
  let cost: number | null = null;

  // Written before the call, so an attempt that dies mid-flight (timeout,
  // instance killed) still leaves a trace to reconcile against.
  await log("pending");

  try {
    // Our order id as the idempotency key: stable across retries of the same
    // order, so a network retry cannot buy (and pay for) two keys.
    const res = await createOrder({
      sku,
      quantity: qty,
      idempotencyKey: orderId,
    });
    keys = res.keys;
    supplierRef = res.id;
    cost = res.total || null;
  } catch (e) {
    const err = e instanceof DripError ? e : null;
    const code = err?.code ?? "UNKNOWN";

    const ok = await refund(`Supplier ${code}: ${err?.message ?? "failed"}`);
    await log(ok ? "refunded" : "failed", { error: code });

    return NextResponse.json(
      {
        error: code,
        message: buyerMessage(code),
        refunded: ok,
        // Tells the UI whether "try again" is worth offering.
        retryable: err?.retryable ?? false,
      },
      { status: err?.httpStatus && err.httpStatus < 500 ? 409 : 502 }
    );
  }

  /* ---------- 3. settle: attach key, mark delivered ---------- */
  // The deposit has now been spent, so this is recorded before settling: if
  // settle fails, the log still shows the key was bought and paid for.
  await log("fulfilled", { ref: supplierRef, cost });

  const { data: settled, error: settleErr } = await supabase.rpc("settle_order", {
    p_order_id: orderId,
    p_keys: keys,
    p_ref: supplierRef,
  });

  if (settleErr) {
    // The key was bought and paid for. Refunding now would give away a key for
    // free, so the order stays 'paid' for an admin to finish by hand — and the
    // key is returned to the buyer regardless, since they did pay for it.
    return NextResponse.json(
      {
        order_id: orderId,
        keys,
        warning: "DELIVERED_NOT_RECORDED",
        message:
          "Your key is below. Save it now — our records need a manual check.",
      },
      { status: 200 }
    );
  }

  return NextResponse.json({ order: settled, keys });
}
