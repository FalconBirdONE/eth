import { handle, HttpError, requireUser } from "@/lib/auth/privy";
import { cancelMessage } from "@/lib/flash/client";
import { isActive, refresh, store, toOrderView } from "@/lib/flash/orders";

// Order detail by intent ID, refreshed live from Flash while the order is active.
export const GET = handle(async (req: Request, ctx: RouteContext<"/api/orders/[id]">) => {
  const userId = await requireUser(req);
  const { id } = await ctx.params;
  const intent = store.get(id);
  if (!intent || intent.userId !== userId) throw new HttpError(404, "Order not found");
  if (isActive(intent)) await refresh(intent);
  return Response.json({
    ...toOrderView(intent),
    // The wallet signs this with personal_sign, then POSTs it to ./cancel.
    cancelMessage: intent.providerOrderId && isActive(intent) ? cancelMessage(intent.providerOrderId) : null,
  });
});
