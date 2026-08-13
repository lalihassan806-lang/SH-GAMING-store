/**
 * Drip supplier API client.
 * Docs: https://dripclientofficial.dev/docs
 *
 * Server-only. DRIP_API_KEY must never reach the browser, so this module has
 * no "use client" and is only imported from route handlers / server actions.
 *
 * MONEY: the supplier works in USD microcents, where 1 USD = 100_000_000.
 * The docs warn explicitly not to treat these as bank cents (÷100). We keep
 * the raw integer and only convert for display.
 */

export const MICROCENTS_PER_USD = 100_000_000;

/**
 * The API adds a 1% developer fee on every purchase, charged server-side. The
 * catalogue's priceUsd is BEFORE that fee, so the real cost of a key is ~1%
 * higher than the listed price. Margins must be worked out against this.
 */
export const DEVELOPER_FEE_PERCENT = 1;

export function microcentsToUsd(mc: number | null | undefined): number {
  return Number(mc ?? 0) / MICROCENTS_PER_USD;
}

/** Listed price plus the 1% fee — what the deposit is actually charged. */
export function costWithFeeUsd(priceUsd: string | number): string {
  const p = Number(priceUsd) || 0;
  return (p * (1 + DEVELOPER_FEE_PERCENT / 100)).toFixed(2);
}

const BASE_URL = process.env.DRIP_BASE_URL || "https://dripclientofficial.dev";

/** Absent key = supplier disabled; callers must handle this. */
export const supplierEnabled = !!process.env.DRIP_API_KEY;

export type DripSku = {
  apiCode: string;
  name: string;
  product: string;
  productApiCode: string;
  category: string | null;
  label: string | null;
  days: number | null;
  price: number; // microcents
  priceUsd: string;
  stock: number;
  inStock: boolean;
  /** Marketing copy and artwork, used when importing a product. */
  description: string | null;
  imageUrl: string | null;
};

/** One supplier product with its duration SKUs, ready to import. */
export type DripProduct = {
  productApiCode: string;
  name: string;
  category: string | null;
  description: string | null;
  imageUrl: string | null;
  skus: DripSku[];
};

/**
 * The catalogue is a flat list of duration SKUs, but our schema is a product
 * with variants underneath it. This groups the former into the latter.
 */
export function groupSkus(skus: DripSku[]): DripProduct[] {
  const byProduct = new Map<string, DripProduct>();

  for (const s of skus) {
    const code = s.productApiCode || s.product;
    if (!code) continue;

    let p = byProduct.get(code);
    if (!p) {
      p = {
        productApiCode: code,
        name: s.product || s.name,
        category: s.category,
        // Taken from the first SKU: the supplier repeats the same product-level
        // copy and artwork on every duration.
        description: s.description,
        imageUrl: s.imageUrl,
        skus: [],
      };
      byProduct.set(code, p);
    }
    p.skus.push(s);
    if (!p.description && s.description) p.description = s.description;
    if (!p.imageUrl && s.imageUrl) p.imageUrl = s.imageUrl;
  }

  // Cheapest duration first, so the imported variants read 1 day → 30 days
  // rather than in whatever order the supplier happened to return them.
  for (const p of byProduct.values()) {
    p.skus.sort((a, b) => a.price - b.price);
  }

  return [...byProduct.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** Supplier image paths are relative; make them absolute for our <img>. */
export function absoluteImageUrl(u: string | null | undefined): string | null {
  const raw = String(u ?? "").trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${BASE_URL}${raw.startsWith("/") ? "" : "/"}${raw}`;
}

export type DripOrder = {
  id: string;
  status: string;
  sku: string;
  quantity: number;
  keys: string[];
  total: number; // microcents
  totalUsd: string;
};

/** Maps supplier error codes to messages a buyer can act on. */
export class DripError extends Error {
  code: string;
  httpStatus: number;
  /** True when the failure is transient and a later retry may succeed. */
  retryable: boolean;

  constructor(code: string, message: string, httpStatus: number) {
    super(message);
    this.name = "DripError";
    this.code = code;
    this.httpStatus = httpStatus;
    this.retryable = httpStatus === 429 || httpStatus >= 500;
  }
}

/** Buyer-facing text. Supplier wallet problems must not leak to customers. */
export function buyerMessage(code: string): string {
  switch (code) {
    case "BUSY":
      return "This product just went out of stock. Please try again shortly.";
    case "UNKNOWN_DURATION":
    case "NOT_FOUND":
      return "This item is no longer available from our supplier.";
    case "INVALID_QTY":
      return "That quantity is not allowed.";
    // INSUFFICIENT_BALANCE means the STORE OWNER's deposit is empty, not the
    // buyer's wallet. Saying so would be confusing and reveals our position.
    case "INSUFFICIENT_BALANCE":
    case "UNAUTHORIZED":
    case "FORBIDDEN":
      return "Delivery is temporarily unavailable. Your money has been returned.";
    default:
      return "We could not deliver the key. Your money has been returned.";
  }
}

async function call<T>(
  path: string,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<T> {
  if (!supplierEnabled) {
    throw new DripError("NOT_CONFIGURED", "DRIP_API_KEY is not set.", 500);
  }

  const { timeoutMs = 20_000, ...rest } = init;

  // Without a timeout a hung supplier would hold the buyer's request open
  // until the platform kills it, leaving the order stuck in 'paid'.
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...rest,
      signal: ac.signal,
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${process.env.DRIP_API_KEY}`,
        Accept: "application/json",
        ...(rest.body ? { "Content-Type": "application/json" } : {}),
        ...(rest.headers || {}),
      },
    });
  } catch (e: any) {
    clearTimeout(timer);
    const aborted = e?.name === "AbortError";
    throw new DripError(
      aborted ? "TIMEOUT" : "NETWORK",
      aborted ? "Supplier did not respond in time." : "Could not reach supplier.",
      503
    );
  }
  clearTimeout(timer);

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // Non-JSON body (HTML error page, proxy interstitial) — treat as failure
    // rather than assuming success from the status code alone.
    throw new DripError("BAD_RESPONSE", "Supplier returned an unreadable reply.", 502);
  }

  if (!res.ok) {
    const code = json?.error?.code || `HTTP_${res.status}`;
    const message = json?.error?.message || `Supplier returned ${res.status}.`;
    throw new DripError(code, message, res.status);
  }

  return (json?.data ?? json) as T;
}

/** Full buyable SKU catalogue. Prices reflect our account tier. */
export async function listSkus(): Promise<DripSku[]> {
  const data = await call<{ items?: DripSku[] }>("/api/v1/products");
  return data?.items ?? [];
}

/** Our deposit balance with the supplier, in microcents. */
export async function getBalance(): Promise<{ balance: number; balanceUsd: string }> {
  const d = await call<any>("/api/v1/balance");
  return {
    balance: Number(d?.balance ?? 0),
    balanceUsd: String(d?.balanceUsd ?? "0.00"),
  };
}

/**
 * Buy keys for one SKU.
 *
 * `idempotencyKey` is required by the API and must be STABLE for a given
 * order: reusing it on a retry returns the original order instead of charging
 * the deposit a second time. We derive it from our own order id upstream.
 *
 * Never send a price — the API ignores client prices and charges from its own
 * database, so attempting to would only create a false sense of control.
 */
export async function createOrder(opts: {
  sku: string;
  quantity?: number;
  idempotencyKey: string;
}): Promise<DripOrder> {
  const quantity = Math.max(1, Math.min(50, opts.quantity ?? 1));

  const d = await call<any>("/api/v1/orders", {
    method: "POST",
    headers: { "Idempotency-Key": opts.idempotencyKey },
    body: JSON.stringify({ sku: opts.sku, quantity }),
    timeoutMs: 30_000,
  });

  const keys: string[] = Array.isArray(d?.keys)
    ? d.keys.filter((k: any) => typeof k === "string" && k.trim())
    : [];

  // A 200 with no keys is a protocol violation. Refusing it here means the
  // caller refunds instead of marking a keyless order as delivered.
  if (keys.length === 0) {
    throw new DripError("NO_KEYS", "Supplier accepted the order but returned no keys.", 502);
  }

  return {
    id: String(d?.id ?? ""),
    status: String(d?.status ?? ""),
    sku: String(d?.sku ?? opts.sku),
    quantity: Number(d?.quantity ?? quantity),
    keys,
    total: Number(d?.total ?? 0),
    totalUsd: String(d?.totalUsd ?? "0.00"),
  };
}
