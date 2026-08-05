import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isDemo } from "@/lib/demo";

/** User submits a wallet top-up request. An admin must approve it. */
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
  if (!user) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const amount = Number(body?.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) {
    return NextResponse.json({ error: "Enter a valid amount." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("topups")
    .insert({
      user_id: user.id,
      amount,
      method: String(body?.method || "").slice(0, 50),
      sender_name: String(body?.sender_name || "").slice(0, 80),
      tx_ref: String(body?.tx_ref || "").slice(0, 120),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ topup: data });
}
