import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { isDemo } from "@/lib/demo";
import { queryOrder, gatewayEnabled } from "@/lib/binance-pay";

/**
 * Where has my top-up got to?
 *
 * The webhook is the primary credit path, but it can be delayed or lost, and a
 * buyer who has paid and sees an unchanged balance assumes the money is gone.
 * So when the browser asks about a payment that is still unpaid locally, we ask
 * Binance directly and credit from the authoritative answer.
 *
 * This is safe to expose to buyers because the credit still goes through
 * credit_gateway_payment, which reads the amount from our own row and refuses
 * to pay out twice. A buyer polling this endpoint cannot make Binance say PAID.
 */
export async function POST(request: Request) {
  if (isDemo) {
    return NextResponse.json({ error: "Demo mode." }, { status: 503 });
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

  const tradeNo = String(body?.tradeNo || "");
  if (!/^[A-Za-z0-9]{8,32}$/.test(tradeNo)) {
    return NextResponse.json({ error: "Bad reference." }, { status: 400 });
  }

  // RLS limits this to the caller's own rows, so one buyer cannot poll — or
  // trigger a credit for — another buyer's payment.
  const { data: row } = await supabase
    .from("gateway_payments")
    .select("trade_no,status,amount,pay_amount,pay_currency")
    .eq("trade_no", tradeNo)
    .maybeSingle();

  if (!row) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  if (row.status === "credited") {
    return NextResponse.json({ status: "credited", amount: row.amount });
  }
  if (row.status === "closed" || row.status === "failed") {
    return NextResponse.json({ status: row.status });
  }
  if (row.status === "mismatch") {
    // Deliberately vague: the buyer should talk to support rather than retry.
    return NextResponse.json({ status: "review" });
  }
  if (!gatewayEnabled) {
    return NextResponse.json({ status: row.status });
  }

  // Throttled in the database, not in memory: this runs on serverless instances
  // that do not share state, so an in-process limiter would not actually limit
  // anything. A refused claim is reported as 'pending' — the caller is polling
  // and will ask again shortly.
  const { data: claimed } = await supabase.rpc("claim_gateway_check", {
    p_trade_no: tradeNo,
  });
  if (claimed !== true) {
    return NextResponse.json({ status: "pending" });
  }

  let remote;
  try {
    remote = await queryOrder(tradeNo);
  } catch (e) {
    console.error("[binance-pay] status query failed", tradeNo, e);
    // Not an error for the buyer: the webhook may still arrive.
    return NextResponse.json({ status: "pending" });
  }

  if (remote.status === "PAID") {
    const { data: credited, error } = await createAdminClient().rpc(
      "credit_gateway_payment",
      {
        p_trade_no: tradeNo,
        p_transaction_id: remote.transactionId,
        // No amount passed on purpose: this reply quotes the ORDER amount, not
        // what was collected, so it is not the figure the mismatch check wants.
        p_paid_amount: null,
        p_raw: { source: "status_query", ...remote },
      }
    );

    if (error) {
      console.error("[binance-pay] credit from status failed", tradeNo, error.message);
      return NextResponse.json({ status: "pending" });
    }
    if (Number(credited) === -1) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({ status: "credited", amount: row.amount });
  }

  if (["CANCELED", "EXPIRED", "ERROR"].includes(remote.status)) {
    await createAdminClient().rpc("close_gateway_payment", {
      p_trade_no: tradeNo,
      p_status: remote.status === "ERROR" ? "failed" : "closed",
      p_raw: { source: "status_query", ...remote },
    });
    return NextResponse.json({ status: "closed" });
  }

  return NextResponse.json({ status: "pending" });
}
