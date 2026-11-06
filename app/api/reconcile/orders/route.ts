import { timingSafeEqual } from "node:crypto";
import { isActive, refresh, store } from "@/lib/flash/orders";

// Called by Supabase Cron with `Authorization: Bearer <CRON_SECRET>`. Refreshes every active order.
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const active = store.all().filter(isActive);
  const results = await Promise.allSettled(active.map(refresh));
  const failed = results.filter((r) => r.status === "rejected").length;
  return Response.json({ checked: active.length, failed, at: new Date().toISOString() });
}
