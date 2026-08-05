"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconArrow } from "./Icons";

const PRESETS = [500, 1000, 2000, 5000];

export default function TopupForm({
  methods,
  demo,
  loggedIn,
}: {
  methods: string[];
  demo: boolean;
  loggedIn: boolean;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState<string>("1000");
  const [method, setMethod] = useState(methods[0] ?? "JazzCash");
  const [sender, setSender] = useState("");
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ type: "err" | "ok"; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (demo) {
      setMsg({
        type: "err",
        text: "Demo mode — connect Supabase to submit real top-up requests.",
      });
      return;
    }
    if (!loggedIn) {
      router.push("/login?next=/wallet");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(amount),
          method,
          sender_name: sender,
          tx_ref: ref,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Request failed");

      setMsg({
        type: "ok",
        text: "Top-up submitted. Your balance updates as soon as an admin approves it.",
      });
      setRef("");
      setSender("");
      router.refresh();
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message || "Request failed" });
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="card p-6">
      <h2 className="text-lg font-bold text-white">Submit a top-up</h2>
      <p className="mt-1 text-[13px] text-white/45">
        Pay first, then tell us the reference so we can match it.
      </p>

      <div className="mt-6">
        <div className="label">Amount (PKR)</div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setAmount(String(p))}
              className={`rounded-xl border px-3.5 py-2 text-[12.5px] font-bold transition ${
                amount === String(p)
                  ? "border-gold-500/60 bg-gold-500/12 text-white"
                  : "border-white/10 bg-white/[0.03] text-white/60 hover:border-white/25"
              }`}
            >
              Rs {p.toLocaleString()}
            </button>
          ))}
        </div>
        <input
          className="input mt-3"
          type="number"
          min={1}
          step="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Custom amount"
          required
        />
      </div>

      <div className="mt-5">
        <label className="label" htmlFor="method">Payment method</label>
        <select
          id="method"
          className="input"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
        >
          {methods.map((m) => (
            <option key={m} value={m} className="bg-ink-900">
              {m}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="sender">Sender name</label>
          <input
            id="sender"
            className="input"
            value={sender}
            onChange={(e) => setSender(e.target.value)}
            placeholder="Name on the account"
          />
        </div>
        <div>
          <label className="label" htmlFor="ref">Transaction ID / TID</label>
          <input
            id="ref"
            className="input"
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            placeholder="e.g. JC8837201"
            required
          />
        </div>
      </div>

      {msg && (
        <div
          role="alert"
          className={`mt-5 rounded-xl border px-4 py-3 text-[13px] font-medium ${
            msg.type === "err"
              ? "border-rose-500/25 bg-rose-500/10 text-rose-200"
              : "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
          }`}
        >
          {msg.text}
        </div>
      )}

      <button type="submit" disabled={busy} className="btn-gold mt-6 w-full justify-center">
        {busy ? "Submitting…" : "Submit top-up request"}
        {!busy && (
          <span className="grid h-5 w-5 place-items-center rounded-full bg-black/20">
            <IconArrow className="h-3 w-3" />
          </span>
        )}
      </button>
    </form>
  );
}
