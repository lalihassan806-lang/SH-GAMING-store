import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { isDemo } from "@/lib/demo";
import { verifyWebhook } from "@/lib/binance-pay";

/**
 * Binance Pay payment notification. This is the only place in the app where a
 * wallet gains money without a human approving it, so it is written defensively:
 *
 *   · The signature is checked BEFORE anything is read from the body. RSA with
 *     SHA256 against Binance's published public key — not the HMAC-SHA512 used
 *     to sign our outbound calls. Conflating the two would let anyone POST here
 *     and credit their own balance.
 *   · The amount credited comes from our own gateway_payments row, never from
 *     the notification. The notification reports crypto; our row holds the PKR
 *     figure the buyer was quoted.
 *   · Binance retries up to six times until acknowledged, so crediting is
 *     idempotent in the database and every retry is answered with SUCCESS.
 *
 * Always replies HTTP 200 with returnCode SUCCESS once the payment is handled,
 * including for duplicates. Returning FAIL only earns five more retries of a
 * request we have already dealt with.
 */

const ACK = { returnCode: "SUCCESS", returnMessage: null };
const REJECT = { returnCode: "FAIL", returnMessage: "Invalid signature" };

export async function POST(request: Request) {
  if (isDemo) {
    return NextResponse.json(
      { returnCode: "FAIL", returnMessage: "Not configured" },
      { status: 503 }
    );
  }

  // The exact bytes Binance signed. Parsing first and re-serialising would
  // change whitespace and key order, and the signature covers the original
  // text — a genuine notification would then fail to verify.
  const rawBody = await request.text();

  const h = request.headers;
  const ok = await verifyWebhook({
    rawBody,
    timestamp: h.get("BinancePay-Timestamp"),
    nonce: h.get("BinancePay-Nonce"),
    signature: h.get("BinancePay-Signature"),
    serial: h.get("BinancePay-Certificate-SN"),
  });

  if (!ok) {
    console.warn("[binance-pay] webhook signature rejected");
    return NextResponse.json(REJECT, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    // Signed but unparseable. Retrying cannot fix it, so acknowledge and stop.
    return NextResponse.json(ACK);
  }

  // `data` is a JSON *string*, not an object — it needs a second parse.
  let data: any = {};
  try {
    data = typeof event?.data === "string" ? JSON.parse(event.data) : event?.data ?? {};
  } catch {
    data = {};
  }

  const tradeNo = String(data?.merchantTradeNo || "");
  if (!tradeNo) return NextResponse.json(ACK);

  // Service role: credit_gateway_payment is deliberately not granted to
  // authenticated, and this request carries no user session anyway.
  const admin = createAdminClient();

  if (event?.bizStatus === "PAY_SUCCESS") {
    const { data: credited, error } = await admin.rpc("credit_gateway_payment", {
      p_trade_no: tradeNo,
      p_transaction_id: data?.transactionId ? String(data.transactionId) : null,
      p_paid_amount: data?.totalFee != null ? Number(data.totalFee) : null,
      p_raw: event,
    });

    if (error) {
      // A real database failure IS worth a retry — the money arrived and the
      // buyer has not been credited yet.
      console.error("[binance-pay] credit failed", tradeNo, error.message);
      return NextResponse.json(
        { returnCode: "FAIL", returnMessage: "Retry" },
        { status: 500 }
      );
    }

    // -1 = no matching row: a payment for a trade number we never issued.
    // Retrying will not conjure the row, so acknowledge and flag it for a human.
    if (Number(credited) === -1) {
      console.error("[binance-pay] paid order has no local row", tradeNo);
    }

    return NextResponse.json(ACK);
  }

  if (event?.bizStatus === "PAY_CLOSED" || event?.bizStatus === "PAY_FAIL") {
    // Cannot un-credit a paid payment: close_gateway_payment only touches rows
    // still in 'created' or 'paid'.
    await admin.rpc("close_gateway_payment", {
      p_trade_no: tradeNo,
      p_status: event.bizStatus === "PAY_FAIL" ? "failed" : "closed",
      p_raw: event,
    });
    return NextResponse.json(ACK);
  }

  // Unknown bizStatus — acknowledged so Binance stops, logged so we notice.
  console.warn("[binance-pay] unhandled bizStatus", event?.bizStatus);
  return NextResponse.json(ACK);
}
