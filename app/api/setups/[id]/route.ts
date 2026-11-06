import type { NextRequest } from "next/server";
import { isUuid } from "@/lib/setups/auth";
import type { SetupDetailResponse } from "@/lib/shared/types";
import { loadSetup } from "@/lib/setups/cards";

// One setup with every version (accepted in order, then pending candidates),
// plus its card.
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/setups/[id]">) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return Response.json({ error: "setup not found" }, { status: 404 });

  const detail = await loadSetup(id);
  if (!detail) return Response.json({ error: "setup not found" }, { status: 404 });
  return Response.json(detail satisfies SetupDetailResponse);
}
