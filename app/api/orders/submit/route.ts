import { z } from "zod";
import { handle, HttpError, requireUser } from "@/lib/auth/privy";
import { flash, FlashError } from "@/lib/flash/client";
import { store, toOrderView } from "@/lib/flash/orders";

const Hex = z.string().regex(/^0x[0-9a-fA-F]+$/);
const Body = z.object({ intentId: z.string().uuid(), signature: Hex, permitSignature: Hex.optional() });

export const POST = handle(async (req: Request) => {
  const userId = await requireUser(req);
  const body = Body.parse(await req.json());
  const intent = store.get(body.intentId);
  if (!intent || intent.userId !== userId) throw new HttpError(404, "Order intent not found");

  // Only one submit per intent ever reaches Flash; repeats get the current state back.
  if (!store.transition(intent.id, "awaiting_signature", "checking_submission")) {
    return Response.json(toOrderView(intent));
  }
  if (intent.permitTypedData && !body.permitSignature) {
    intent.status = "awaiting_signature";
    throw new HttpError(400, "This order also needs the Permit2 signature");
  }

  try {
    const { orderId } = await flash.placeOrder({
      ...intent.trade,
      funderAddress: intent.wallet,
      quoteId: intent.quoteId,
      userSignature: body.signature,
      evmOrderTypedData: intent.orderTypedData,
      ...(intent.permitTypedData && {
        evmPermitTypedData: intent.permitTypedData,
        evmPermitSignature: body.permitSignature,
      }),
    });
    intent.providerOrderId = orderId;
    intent.status = "open";
  } catch (e) {
    if (e instanceof FlashError && e.status >= 400 && e.status < 500) {
      // Flash rejected it outright, so no order exists.
      intent.status = "failed";
      intent.error = `${e.code}: ${e.message}`;
    }
    // Timeouts and 5xx stay checking_submission; reconcile matches them by signed terms, never retries.
  }
  store.put(intent);
  return Response.json(toOrderView(intent));
});
