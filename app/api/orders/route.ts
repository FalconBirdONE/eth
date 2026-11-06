import { handle, requireUser } from "@/lib/auth/privy";
import { store, toOrderView } from "@/lib/flash/orders";

// My Orders list. Statuses are refreshed by /api/reconcile/orders and GET /api/orders/[id].
export const GET = handle(async (req: Request) => {
  const userId = await requireUser(req);
  const orders = store
    .forUser(userId)
    .filter((i) => i.status !== "awaiting_signature")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(toOrderView);
  return Response.json({ orders });
});
