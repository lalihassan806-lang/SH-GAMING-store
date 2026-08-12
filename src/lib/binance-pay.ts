/**
 * Binance Pay merchant API client.
 * Docs: https://developers.binance.com/en/docs/products/binance-pay-merchant
 *
 * Server-only. BINANCE_PAY_SECRET_KEY signs requests that move real money, so
 * this module has no "use client" and must only be imported from route
 * handlers or server actions.
 *
 * TWO DIFFERENT ALGORITHMS — do not mix them up:
 *   · Outbound requests we sign     → HMAC-SHA512 with our secret key
 *   · Inbound webhooks we verify    → RSA-SHA256 with Binance's public key
 * Verifying a webhook with HMAC would leave the endpoint forgeable, and a
 * forged webhook credits a wallet with money nobody paid.
 *
 * CURRENCY: we never convert PKR ourselves. The order is created with
 * fiatAmount/fiatCurrency and Binance picks the crypto amount, so there is no
 * exchange rate anywhere in this codebase to get wrong or keep up to date.
 */

import crypto from "node:crypto";

const HOST = process.env.BINANCE_PAY_BASE_URL || "https://bpay.binanceapi.com";

/** Absent credentials = gateway disabled; callers must handle this. */
export const gatewayEnabled =
  !!process.env.BINANCE_PAY_API_KEY && !!process.env.BINANCE_PAY_SECRET_KEY;

export class BinancePayError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "BinancePayError";
    this.code = code;
  }
}

/** Buyer-facing text. Merchant-account problems must not leak to customers. */
export function buyerMessage(code: string): string {
  switch (code) {
    case "NOT_CONFIGURED":
      return "Card and crypto payments are not switched on yet. Use a manual method below.";
    case "TIMEOUT":
    case "NETWORK":
      return "Binance Pay is not responding. Please try again in a moment.";
    // A signature or permission failure is our problem, not the buyer's, and
    // naming it would only tell an attacker which part of the setup is broken.
    case "400002":
    case "400003":
    case "400004":
    case "400201":
      return "Automatic payment is temporarily unavailable. Use a manual method below.";
    default:
      return "Could not start the payment. Please try again or use a manual method.";
  }
}

/**
 * merchantTradeNo must be letters and digits only, 32 characters at most.
 * Random rather than derived from a user id: the value is echoed back in the
 * webhook, so it should not carry anything worth knowing.
 */
export function newTradeNo(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.randomBytes(28);
  let out = "SH";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

/** 32-byte alphanumeric nonce, as the spec requires. */
function newNonce(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const bytes = crypto.randomBytes(32);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return out;
}

async function call<T>(path: string, body: unknown): Promise<T> {
  if (!gatewayEnabled) {
    throw new BinancePayError(
      "NOT_CONFIGURED",
      "BINANCE_PAY_API_KEY / BINANCE_PAY_SECRET_KEY are not set."
    );
  }

  const json = JSON.stringify(body ?? {});
  const timestamp = Date.now().toString();
  const nonce = newNonce();

  // Exactly this shape, including the trailing newline. '\n' is LF (0x0A).
  const payload = `${timestamp}\n${nonce}\n${json}\n`;
  const signature = crypto
    .createHmac("sha512", process.env.BINANCE_PAY_SECRET_KEY!)
    .update(payload)
    .digest("hex")
    .toUpperCase();

  // Binance only processes a request within 1s of its timestamp, so a slow
  // connection is a hard failure rather than something to wait out.
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 15_000);

  let res: Response;
  try {
    res = await fetch(`${HOST}${path}`, {
      method: "POST",
      signal: ac.signal,
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "BinancePay-Timestamp": timestamp,
        "BinancePay-Nonce": nonce,
        "BinancePay-Certificate-SN": process.env.BINANCE_PAY_API_KEY!,
        "BinancePay-Signature": signature,
      },
      body: json,
    });
  } catch (e: any) {
    clearTimeout(timer);
    const aborted = e?.name === "AbortError";
    throw new BinancePayError(
      aborted ? "TIMEOUT" : "NETWORK",
      aborted ? "Binance Pay did not respond in time." : "Could not reach Binance Pay."
    );
  }
  clearTimeout(timer);

  const text = await res.text();
  let parsed: any = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    throw new BinancePayError("BAD_RESPONSE", "Binance Pay returned an unreadable reply.");
  }

  // The HTTP status is not the answer here: Binance returns 200 with
  // status:"FAIL" for business errors, so trusting the status code alone would
  // read a rejection as a success.
  if (!res.ok || parsed?.status !== "SUCCESS") {
    throw new BinancePayError(
      String(parsed?.code || `HTTP_${res.status}`),
      String(parsed?.errorMessage || `Binance Pay returned ${res.status}.`)
    );
  }

  return parsed.data as T;
}

export type BinanceOrder = {
  prepayId: string;
  checkoutUrl: string;
  deeplink: string;
  qrcodeLink: string;
  expireTime: number;
  /** Crypto amount the buyer must send, e.g. "3.58". */
  totalFee: string;
  /** Crypto the buyer pays in, e.g. "USDT". */
  currency: string;
};

/**
 * Create a checkout for a wallet top-up.
 *
 * `fiatAmount` + `fiatCurrency` is used deliberately in place of a crypto
 * amount: Binance converts at its own live rate, which keeps the store out of
 * the business of quoting PKR/USDT and means a stale rate can never sell a
 * top-up too cheaply.
 */
export async function createTopupOrder(opts: {
  tradeNo: string;
  amount: number;
  currency?: string;
  returnUrl?: string;
  webhookUrl?: string;
}): Promise<BinanceOrder> {
  const d = await call<any>("/binancepay/openapi/v3/order", {
    env: { terminalType: "WEB" },
    merchantTradeNo: opts.tradeNo,
    fiatAmount: Number(opts.amount.toFixed(2)),
    fiatCurrency: (opts.currency || "PKR").toUpperCase(),
    description: "Wallet top-up",
    goodsDetails: [
      {
        goodsType: "02", // virtual goods
        goodsCategory: "6000", // Game & Recharge
        referenceGoodsId: "WALLET-TOPUP",
        goodsName: "Wallet top-up",
      },
    ],
    // 30 minutes. Long enough to finish a transfer, short enough that an
    // abandoned checkout does not sit around looking payable.
    orderExpireTime: Date.now() + 30 * 60 * 1000,
    ...(opts.returnUrl ? { returnUrl: opts.returnUrl } : {}),
    ...(opts.webhookUrl ? { webhookUrl: opts.webhookUrl } : {}),
  });

  if (!d?.checkoutUrl) {
    throw new BinancePayError("NO_CHECKOUT", "Binance Pay returned no checkout link.");
  }

  return {
    prepayId: String(d.prepayId ?? ""),
    checkoutUrl: String(d.checkoutUrl),
    deeplink: String(d.deeplink ?? ""),
    qrcodeLink: String(d.qrcodeLink ?? ""),
    expireTime: Number(d.expireTime ?? 0),
    totalFee: String(d.totalFee ?? ""),
    currency: String(d.currency ?? ""),
  };
}

/**
 * Authoritative order status, straight from Binance.
 *
 * Used as the fallback when a buyer returns to the site before the webhook
 * lands — webhooks can be delayed or lost, and a paid buyer staring at an
 * unchanged balance will assume the money is gone.
 */
export async function queryOrder(
  tradeNo: string
): Promise<{ status: string; transactionId: string | null; orderAmount: string | null }> {
  const d = await call<any>("/binancepay/openapi/v2/order/query", {
    merchantTradeNo: tradeNo,
  });
  return {
    status: String(d?.status ?? ""),
    transactionId: d?.transactionId ? String(d.transactionId) : null,
    orderAmount: d?.orderAmount != null ? String(d.orderAmount) : null,
  };
}

/* ------------------------- WEBHOOK VERIFICATION ------------------------- */

// Binance's public key changes rarely, and fetching it is itself a signed API
// call. Cached per instance so a burst of notifications does not fan out into a
// burst of certificate lookups.
let certCache: { key: string; serial: string; at: number } | null = null;
const CERT_TTL_MS = 60 * 60 * 1000;

function toPem(raw: string): string {
  const s = raw.trim();
  if (s.includes("BEGIN")) return s;
  // Some responses omit the PEM armour; createVerify needs it.
  const body = s.replace(/\s+/g, "").match(/.{1,64}/g)?.join("\n") ?? s;
  return `-----BEGIN PUBLIC KEY-----\n${body}\n-----END PUBLIC KEY-----`;
}

async function getCertificate(): Promise<{ key: string; serial: string }> {
  if (certCache && Date.now() - certCache.at < CERT_TTL_MS) {
    return { key: certCache.key, serial: certCache.serial };
  }

  const d = await call<any>("/binancepay/openapi/certificates", {});
  const item = Array.isArray(d) ? d[0] : d;
  const raw = item?.certPublic;
  if (!raw) {
    throw new BinancePayError("NO_CERT", "Binance Pay returned no public key.");
  }

  const cert = { key: toPem(String(raw)), serial: String(item?.certSerial ?? "") };
  certCache = { ...cert, at: Date.now() };
  return cert;
}

/**
 * True only if this notification really came from Binance Pay.
 *
 * `rawBody` must be the exact bytes received. Re-serialising the parsed JSON
 * would change key order and whitespace, and the signature covers the original
 * text — so a re-serialised body fails verification even when it is genuine.
 */
export async function verifyWebhook(opts: {
  rawBody: string;
  timestamp: string | null;
  nonce: string | null;
  signature: string | null;
  serial?: string | null;
}): Promise<boolean> {
  const { rawBody, timestamp, nonce, signature } = opts;
  if (!timestamp || !nonce || !signature) return false;

  let cert: { key: string; serial: string };
  try {
    cert = await getCertificate();
  } catch {
    // Failing closed is the only safe choice: treating an unverifiable
    // notification as genuine is exactly how a wallet gets credited for free.
    return false;
  }

  // If Binance names a key we do not hold, drop our cache once and refetch —
  // this is what a key rotation looks like from here.
  if (opts.serial && cert.serial && opts.serial !== cert.serial) {
    certCache = null;
    try {
      cert = await getCertificate();
    } catch {
      return false;
    }
  }

  const payload = `${timestamp}\n${nonce}\n${rawBody}\n`;

  try {
    return crypto
      .createVerify("RSA-SHA256")
      .update(payload, "utf8")
      .verify(cert.key, Buffer.from(signature, "base64"));
  } catch {
    // Malformed signature or key — not genuine as far as we are concerned.
    return false;
  }
}
