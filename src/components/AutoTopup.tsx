"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { IconBolt, IconCheck, IconClock } from "./Icons";

const PRESETS = [500, 1000, 2000, 5000];

/**
 * Instant wallet top-up through Binance Pay.
 *
 * The two halves of this component:
 *   · Starting a payment — opens Binance's hosted checkout in a new tab.
 *   · Confirming one — polls our own status endpoint.
 *
 * Polling exists because the credit normally arrives by webhook, which this
 * page cannot observe. Without it a buyer who has paid sees an unchanged
 * balance and concludes the money vanished.
 */
export default function AutoTopup({
  enabled,
  demo,
  loggedIn,
}: {
  enabled: boolean;
  demo: boolean;
  loggedIn: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();

  const [amount, setAmount] = useState("1000");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<{
    tradeNo: string;
    url: string;
    payAmount: string;
    payCurrency: string;
  } | null>(null);
  const [done, setDone] = useState(false);
  const [waiting, setWaiting] = useState(false);

  // Held in a ref so the polling effect does not restart on every tick.
  const tradeRef = useRef<string | null>(null);

  const poll = useCallback(
    async (tradeNo: string) => {
      const res = await fetch("/api/wallet/binance/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tradeNo }),
      });
      const json = await res.json().catch(() => ({}));
      return String(json?.status || "");
    },
    []
  );

  /**
   * Binance sends the buyer back with ?paid=<tradeNo>. That only means they
   * finished the checkout page, not that the money settled — hence the poll
   * rather than trusting the parameter.
   */
  const returned = params.get("paid");

  useEffect(() => {
    const trade = pending?.tradeNo || returned;
    if (!trade || done) return;

    tradeRef.current = trade;
    setWaiting(true);

    let stop = false;
    let tries = 0;

    async function tick() {
      if (stop) return;
      tries += 1;

      let status = "";
      try {
        status = await poll(trade!);
      } catch {
        // Offline or a transient failure; the next tick retries.
      }

      if (stop) return;

      if (status === "credited") {
        setDone(true);
        setWaiting(false);
        setPending(null);
        // Refreshes the server-rendered balance card and request history.
        router.refresh();
        return;
      }

      if (status === "closed" || status === "failed") {
        setWaiting(false);
        setError("That payment was cancelled or expired. Start a new one to try again.");
        setPending(null);
        return;
      }

      if (status === "review") {
        setWaiting(false);
        setError("We received a payment that needs checking. Please contact support.");
        return;
      }

      // Roughly three minutes. Giving up on the *poll* is not giving up on the
      // payment: the webhook still credits it whenever it lands, so the message
      // says so rather than implying the money is lost.
      if (tries >= 60) {
        setWaiting(false);
        setError(
          "Still waiting for Binance to confirm. Your balance updates automatically once it does — you can leave this page."
        );
        return;
      }

      setTimeout(tick, 3000);
    }

    const t = setTimeout(tick, 1500);
    return () => {
      stop = true;
      clearTimeout(t);
    };
  }, [pending?.tradeNo, returned, done, poll, router]);

  async function start() {
    setError(null);

    if (demo) {
      setError("Demo mode — connect Supabase and Binance Pay to accept live payments.");
      return;
    }
    if (!loggedIn) {
      router.push("/login?next=/wallet");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/wallet/binance/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not start the payment.");

      setDone(false);
      setPending({
        tradeNo: json.tradeNo,
        url: json.checkoutUrl,
        payAmount: json.payAmount,
        payCurrency: json.payCurrency,
      });

      // Opened rather than redirected so the buyer keeps this tab, which is
      // what is polling for the confirmation.
      window.open(json.checkoutUrl, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      setError(e?.message || "Could not start the payment.");
    }
    setBusy(false);
  }

  if (!enabled) return null;

  return (
    <div className="card border-gold-500/20 p-6">
      <h2 className="flex items-center gap-2 text-lg font-bold text-white">
        <IconBolt className="h-4 w-4 text-gold-400" />
        Instant top-up
      </h2>
      <p className="mt-1 text-[13px] text-white/45">
        Pay with Binance Pay and your balance is credited automatically — no
        waiting for approval.
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
          aria-label="Top-up amount in rupees"
        />
        <p className="mt-2 text-[11.5px] text-white/35">
          Binance converts to crypto at its own live rate when you pay.
        </p>
      </div>

      {done && (
        <div
          role="status"
          className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-[13px] font-medium text-emerald-200"
        >
          <IconCheck className="h-4 w-4" />
          Payment confirmed — your balance has been topped up.
        </div>
      )}

      {waiting && !done && (
        <div
          role="status"
          className="mt-5 rounded-xl border border-gold-500/25 bg-gold-500/10 px-4 py-3 text-[13px] font-medium text-gold-200"
        >
          <div className="flex items-center gap-2">
            <IconClock className="h-4 w-4" />
            Waiting for Binance to confirm your payment…
          </div>
          {pending && (
            <p className="mt-1.5 text-[11.5px] font-semibold text-white/45">
              {pending.payAmount} {pending.payCurrency} · reference {pending.tradeNo}
            </p>
          )}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-[13px] font-medium text-rose-200"
        >
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={start}
        disabled={busy || waiting}
        className="btn-gold mt-6 w-full justify-center"
      >
        {busy ? "Opening Binance Pay…" : waiting ? "Waiting for payment…" : "Pay with Binance"}
      </button>

      {pending && !done && (
        <a
          href={pending.url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost mt-3 w-full justify-center"
        >
          Reopen the payment page
        </a>
      )}
    </div>
  );
}
