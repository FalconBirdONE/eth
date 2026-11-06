import { z } from "zod";
import { assertWalletOwner, handle, HttpError, requireUser } from "@/lib/auth/privy";
import { flash } from "@/lib/flash/client";
import { store, toTrade, type OrderIntent } from "@/lib/flash/orders";

const Body = z.object({
  setupVersionId: z.string().min(1),
  wallet: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  amountIn: z.string().regex(/^[1-9]\d*$/, "USDC base units, positive integer string"),
  limitPrice: z.string().regex(/^\d+(\.\d+)?$/, "decimal string, USDC per WETH"),
  expireTime: z.iso.datetime(),
  idempotencyKey: z.string().min(8),
});

// Stores the intent before returning anything to sign, so a retry with the same key gets the same intent.
export const POST = handle(async (req: Request) => {
  const userId = await requireUser(req);
  const body = Body.parse(await req.json());
  if (Number(body.limitPrice) <= 0) throw new HttpError(400, "Limit price must be positive");
  if (Date.parse(body.expireTime) <= Date.now()) throw new HttpError(400, "Expiry must be in the future");
  await assertWalletOwner(userId, body.wallet);

  const existing = store.byIdempotencyKey(body.idempotencyKey);
  if (existing) {
    if (existing.userId !== userId) throw new HttpError(409, "Idempotency key already used");
    return Response.json(prepareView(existing));
  }

  // shortcut: setupVersionId is not checked against A's setup_versions yet (table not available).
  // Once it is, reject a version that is no longer current with 409 so the user reviews the latest one.
  const trade = toTrade(body.amountIn, body.limitPrice, body.expireTime);
  const quote = await flash.quote(trade, body.wallet);
  if (!quote.evm?.orderTypedData) throw new HttpError(502, "Flash returned no order to sign");
  if (quote.setupTxs?.length) throw new HttpError(501, "Flash requires setup transactions, which this flow does not handle yet");

  const intent: OrderIntent = {
    id: crypto.randomUUID(),
    idempotencyKey: body.idempotencyKey,
    userId,
    wallet: body.wallet,
    setupVersionId: body.setupVersionId,
    amountIn: body.amountIn,
    limitPrice: body.limitPrice,
    expireTime: body.expireTime,
    trade,
    quoteId: quote.quoteId,
    orderTypedData: quote.evm.orderTypedData,
    permitTypedData: quote.evm.permitTypedData,
    createdAt: new Date().toISOString(),
    status: "awaiting_signature",
    providerOrderId: null,
    providerStatus: null,
    fills: [],
    lastCheckedAt: null,
    error: null,
  };
  store.put(intent);
  return Response.json({ ...prepareView(intent), approveTx: quote.evm.approveTx, quote: { from: quote.from, to: quote.to, fees: quote.fees } });
});

function prepareView(i: OrderIntent) {
  return {
    intentId: i.id,
    status: i.status,
    review: {
      setupVersion: i.setupVersionId,
      kind: "Entry order only (Flash limit buy)",
      chain: "Base",
      wallet: i.wallet,
      price: i.limitPrice,
      unit: "USDC per WETH",
      amountIn: i.amountIn,
      expireTime: i.expireTime,
    },
    orderTypedData: i.orderTypedData,
    permitTypedData: i.permitTypedData,
  };
}
