// Server-only Definitive Flash client. Never import from client components: it reads FLASH_API_KEY.
// Docs: https://flash.definitive.fi/docs (read 2026-11-06).

const BASE_URL = "https://flash.definitive.fi/v1";

export type FlashStatus =
  | "ORDER_STATUS_UNSPECIFIED"
  | "ORDER_STATUS_PENDING"
  | "ORDER_STATUS_ACCEPTED"
  | "ORDER_STATUS_PARTIALLY_FILLED"
  | "ORDER_STATUS_FILLED"
  | "ORDER_STATUS_CANCELLED"
  | "ORDER_STATUS_REJECTED"
  | "ORDER_STATUS_TERMINATED";

/** Trade fields shared by /quote and /order. `qty` is in normalized units of the spent asset (USDC on a buy). */
export interface FlashTradeFields {
  targetChain: "base";
  contraChain: "base";
  targetAsset: string;
  contraAsset: string;
  side: "buy" | "sell";
  qty: string;
  orderType: "limit";
  limitCrossPrice: string;
  expireTime?: string;
  evmUsePermit2?: boolean;
}

export interface FlashQuote {
  quoteId: string;
  from: { asset: "target" | "contra"; amount: string; notional: string };
  to: { asset: "target" | "contra"; amount: string; notional: string };
  fees: { estimatedFeeNotional: string };
  evm: {
    approveTx: { to: string; data: string } | null;
    permitTypedData: string | null;
    orderTypedData: string | null;
  } | null;
  setupTxs: string[] | null;
}

export interface FlashOrder {
  orderId: string;
  status: FlashStatus;
  closeReason: string | null;
  funderAddress: string;
  qty: string;
  limitCrossPrice: string | null;
  filled: { targetAmount: string; contraAmount: string; averagePrice: string } | null;
  placedAt: string | null;
  expiresAt: string | null;
}

export interface FlashFill {
  status: string;
  transactionId: string;
  targetAmount: string;
  contraAmount: string;
  fillPrice: string;
  filledAt: string;
}

export class FlashError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const key = process.env.FLASH_API_KEY;
  if (!key) throw new FlashError(500, "CONFIG", "FLASH_API_KEY is not set");
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { "content-type": "application/json", "x-definitive-api-key": key, ...init.headers },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new FlashError(res.status, body?.error?.code ?? "HTTP_ERROR", body?.error?.message ?? res.statusText);
  }
  return body as T;
}

const post = <T>(path: string, body: unknown) => call<T>(path, { method: "POST", body: JSON.stringify(body) });

export const flash = {
  quote: (trade: FlashTradeFields, funderAddress: string) =>
    post<FlashQuote>("/quote", { ...trade, funderAddress }),

  placeOrder: (body: FlashTradeFields & {
    funderAddress: string;
    quoteId: string;
    userSignature: string;
    evmOrderTypedData: string;
    evmPermitTypedData?: string;
    evmPermitSignature?: string;
  }) => post<{ orderId: string }>("/order", body),

  getOrder: (orderId: string, funderAddress: string) =>
    call<{ order: FlashOrder; fills: FlashFill[] }>(
      `/orders/${encodeURIComponent(orderId)}?funderAddress=${funderAddress}`,
    ),

  listOrders: (funderAddress: string) =>
    call<{ orders: FlashOrder[]; nextPageToken: string | null }>(
      `/orders?funderAddress=${funderAddress}&pageSize=50`,
    ),

  cancelOrder: (orderId: string, userSignature: string) =>
    post<{ ok: boolean }>(`/orders/${encodeURIComponent(orderId)}/cancel`, {
      cancelMessage: cancelMessage(orderId),
      userSignature,
    }),
};

/** Exact EIP-191 message Flash expects for a cancel (em dash U+2014, literal newline). */
export const cancelMessage = (orderId: string) => `Definitive Flash v1 — Cancel Order\nOrder: ${orderId}`;
