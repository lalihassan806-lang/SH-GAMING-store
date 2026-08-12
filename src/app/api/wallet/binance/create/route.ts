import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { isDemo } from "@/lib/demo";
import {
  createTopupOrder,
  newTradeNo,
  gatewayEnabled,
  buyerMessage,
  BinancePayError,
} from "@/lib/binance-pay";

/**
 * Starts an automatic wallet top-up.
 *
 * The amount comes from the client, which is fine here and only here: nothing
 * is credited from this request. The row we create is a *quote*, and the wallet
 * only moves later when the webhook confirms Binance actually collected it —
 * against the amount stored in this row, never against a number the browser
 * sends a second time.
 */
export async function POST(request: Request) {
  if (isDemo) {
    return NextResponse.json(
      { error: "Demo mode: Supabase is not configured." },
      { status: 503 }
    );
  }

  if (!gatewayEnabled) {
    return NextResponse.json({ error: buyerMessage("NOT_CONFIGURED") }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Rounded to whole paisa before it ever reaches Binance: an amount with more
  // decimals than the currency has would be quoted at one value and credited at
  // another.
  const amount = Math.round(Number(body?.amount) * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) {
    return NextResponse.json({ error: "Enter a valid amount." }, { status: 400 });
  }

  const tradeNo = newTradeNo();

  // Recorded before the gateway is called. If the call succeeds but this
  // instance dies before writing, the payment would arrive with nothing to
  // match it against and the buyer's money would sit unclaimed.
  const { error: startErr } = await supabase.rpc("start_gateway_payment", {
    p_trade_no: tradeNo,
    p_amount: amount,
    p_provider: "binance_pay",
  });
  if (startErr) {
    return NextResponse.json({ error: startErr.message }, { status: 400 });
  }

  // Derived from the incoming request so the same code works on localhost,
  // a preview deployment and production without a hardcoded domain.
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || new URL(request.url).origin;

  let order;
  try {
    order = await createTopupOrder({
      tradeNo,
      amount,
      currency: "PKR",
      returnUrl: `${origin}/wallet?paid=${tradeNo}`,
      // Passed per-order rather than relying on the portal setting: it keeps
      // preview deployments from sending their webhooks to production.
      webhookUrl: `${origin}/api/wallet/binance/webhook`,
    });
  } catch (e) {
    const code = e instanceof BinancePayError ? e.code : "UNKNOWN";
    // Detail is logged, not returned — the codes name our merchant setup.
    console.error("[binance-pay] create failed", code, e);

    // close_gateway_payment is granted to service_role only — a buyer's session
    // must never be able to move a payment's status. Tidying up the dead row is
    // also not worth failing the response over.
    try {
      await createAdminClient().rpc("close_gateway_payment", {
        p_trade_no: tradeNo,
        p_status: "failed",
      });
    } catch {
      // Leaves the row as 'created'; it simply expires unpaid.
    }

    return NextResponse.json({ error: buyerMessage(code) }, { status: 502 });
  }

  // Best-effort: the payment is already live at Binance, so failing the request
  // now would hide a working checkout link from the buyer.
  await supabase.rpc("attach_gateway_payment", {
    p_trade_no: tradeNo,
    p_prepay_id: order.prepayId,
    p_checkout_url: order.checkoutUrl,
    p_pay_currency: order.currency || null,
    p_pay_amount: order.totalFee ? Number(order.totalFee) : null,
  });

  return NextResponse.json({
    tradeNo,
    checkoutUrl: order.checkoutUrl,
    qrcodeLink: order.qrcodeLink,
    payAmount: order.totalFee,
    payCurrency: order.currency,
    expireTime: order.expireTime,
  });
}
