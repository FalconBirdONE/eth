import { z } from "zod";
import { handle, HttpError, requireUser } from "@/lib/auth/privy";
import { flash } from "@/lib/flash/client";
import { refresh, store, toOrderView } from "@/lib/flash/orders";

const Body = z.object({ signature: z.string().regex(/^0x[0-9a-fA-F]{130}$/) });

export const POST = handle(async (req: Request, ctx: RouteContext<"/api/orders/[id]/cancel">) => {
  const userId = await requireUser(req);
  const { id } = await ctx.params;
  const intent = store.get(id);
  if (!intent || intent.userId !== userId) throw new HttpError(404, "Order not found");
  if (!intent.providerOrderId) throw new HttpError(409, "Order has not reached Flash yet");
  const { signature } = Body.parse(await req.json());
  await flash.cancelOrder(intent.providerOrderId, signature);
  return Response.json(toOrderView(await refresh(intent)));
});
