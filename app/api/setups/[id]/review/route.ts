import type { NextRequest } from "next/server";
import { z } from "zod";
import { hasBearerSecret, isUuid, unauthorized } from "@/lib/setups/auth";
import { ReviewError, reviewCandidate } from "@/lib/setups/review";

const bodySchema = z.object({
  versionId: z.string().refine(isUuid, "versionId must be a UUID"),
  action: z.enum(["accept", "reject"]),
});

// Team reviewer attaches (or rejects) a revision or withdrawal candidate.
// Requires Authorization: Bearer ADMIN_SECRET.
export async function POST(request: NextRequest, ctx: RouteContext<"/api/setups/[id]/review">) {
  if (!hasBearerSecret(request, "ADMIN_SECRET")) return unauthorized();

  const { id } = await ctx.params;
  if (!isUuid(id)) return Response.json({ error: "setup not found" }, { status: 404 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: 'body must be { versionId, action: "accept" | "reject" }' }, { status: 400 });
  }

  try {
    const result = await reviewCandidate(id, parsed.data.versionId, parsed.data.action);
    return Response.json(result);
  } catch (err) {
    if (err instanceof ReviewError) return Response.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
