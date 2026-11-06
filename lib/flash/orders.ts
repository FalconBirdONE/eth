// Order intents, orders and status mapping for Copy/Customize Entry.
import { formatUnits } from "viem";
import { flash, type FlashFill, type FlashOrder, type FlashStatus, type FlashTradeFields } from "./client";

// shortcut: token config lives here until the kickoff commit adds lib/shared/tokens.ts; move it then.
export const BASE_USDC = { address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", decimals: 6 } as const;
export const BASE_WETH = { address: "0x4200000000000000000000000000000000000006", decimals: 18 } as const;

export type OrderStatus =
  | "awaiting_signature"
  | "checking_submission"
  | "open"
  | "partially_filled"
  | "filled"
  | "cancelled"
  | "expired"
  | "failed";

export interface OrderIntent {
  id: string;
  idempotencyKey: string;
  userId: string;
  wallet: string;
  setupVersionId: string;
  /** USDC base units, as a string. */
  amountIn: string;
  /** Exact decimal string, USDC per WETH. */
  limitPrice: string;
  expireTime: string;
  trade: FlashTradeFields;
  quoteId: string;
  orderTypedData: string;
  permitTypedData: string | null;
  createdAt: string;
  status: OrderStatus;
  providerOrderId: string | null;
  providerStatus: FlashStatus | null;
  fills: FlashFill[];
  lastCheckedAt: string | null;
  error: string | null;
}

// shortcut: in-memory store, lost on restart and not shared across serverless instances.
// Replace with the order_intents / orders / fills tables once D's db/schema.ts lands.
const g = globalThis as unknown as { __intents?: Map<string, OrderIntent> };
const intents = (g.__intents ??= new Map());

export const store = {
  get: (id: string) => intents.get(id),
  byIdempotencyKey: (key: string) => [...intents.values()].find((i) => i.idempotencyKey === key),
  forUser: (userId: string) => [...intents.values()].filter((i) => i.userId === userId),
  all: () => [...intents.values()],
  put: (i: OrderIntent) => void intents.set(i.id, i),
  /** Atomic check-and-set; the DB version is an UPDATE ... WHERE status = $from. */
  transition(id: string, from: OrderStatus, to: OrderStatus) {
    const i = intents.get(id);
    if (!i || i.status !== from) return false;
    i.status = to;
    return true;
  },
};

export function toTrade(amountIn: string, limitPrice: string, expireTime: string): FlashTradeFields {
  return {
    targetChain: "base",
    contraChain: "base",
    targetAsset: BASE_WETH.address,
    contraAsset: BASE_USDC.address,
    side: "buy",
    qty: formatUnits(BigInt(amountIn), BASE_USDC.decimals),
    orderType: "limit",
    // Flash docs: limitCrossPrice is the target/contra pair rate. Confirm on the first live quote
    // that "2375" means 2,375 USDC per WETH, not its inverse, before showing it to followers.
    limitCrossPrice: limitPrice,
    expireTime,
    evmUsePermit2: false,
  };
}

export function mapStatus(order: FlashOrder): OrderStatus {
  switch (order.status) {
    case "ORDER_STATUS_PENDING":
    case "ORDER_STATUS_ACCEPTED":
      return "open";
    case "ORDER_STATUS_PARTIALLY_FILLED":
      return "partially_filled";
    case "ORDER_STATUS_FILLED":
      return "filled";
    case "ORDER_STATUS_CANCELLED":
      // Docs list no expiry close reason; treat a cancel at or after expiresAt as expiry.
      return order.closeReason !== "REASON_USER_REQUESTED" && order.expiresAt && Date.parse(order.expiresAt) <= Date.now()
        ? "expired"
        : "cancelled";
    case "ORDER_STATUS_REJECTED":
    case "ORDER_STATUS_TERMINATED":
      return "failed";
    default:
      return "open";
  }
}

const ACTIVE: OrderStatus[] = ["checking_submission", "open", "partially_filled"];
export const isActive = (i: OrderIntent) => ACTIVE.includes(i.status);

/** Refresh one intent from Flash. A `checking_submission` intent is matched by its signed terms, never resubmitted. */
export async function refresh(intent: OrderIntent): Promise<OrderIntent> {
  if (!intent.providerOrderId && intent.status === "checking_submission") {
    const { orders } = await flash.listOrders(intent.wallet);
    const match = orders.find(
      (o) =>
        o.qty === intent.trade.qty &&
        o.limitCrossPrice === intent.trade.limitCrossPrice &&
        (!o.placedAt || Date.parse(o.placedAt) >= Date.parse(intent.createdAt)),
    );
    if (!match) {
      intent.lastCheckedAt = new Date().toISOString();
      return intent;
    }
    intent.providerOrderId = match.orderId;
  }
  if (!intent.providerOrderId) return intent;
  const { order, fills } = await flash.getOrder(intent.providerOrderId, intent.wallet);
  intent.providerStatus = order.status;
  intent.status = mapStatus(order);
  intent.fills = fills;
  intent.lastCheckedAt = new Date().toISOString();
  store.put(intent);
  return intent;
}

/** Response shape for My Orders. Signed terms never change after submission, whatever the creator revises. */
export function toOrderView(i: OrderIntent) {
  return {
    intentId: i.id,
    orderId: i.providerOrderId,
    setupVersion: i.setupVersionId,
    signedEntry: { price: i.limitPrice, unit: "USDC per WETH", amountIn: i.amountIn, expireTime: i.expireTime },
    status: i.status,
    providerStatus: i.providerStatus,
    fills: i.fills.map((f) => ({
      txHash: f.transactionId,
      basescan: `https://basescan.org/tx/${f.transactionId}`,
      targetAmount: f.targetAmount,
      contraAmount: f.contraAmount,
      fillPrice: f.fillPrice,
      confirmation: f.status,
      filledAt: f.filledAt,
    })),
    lastCheckedAt: i.lastCheckedAt,
    error: i.error,
  };
}
