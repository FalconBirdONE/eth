import { connection } from "next/server";
import type { SetupsResponse } from "@/lib/shared/types";
import { getLastSyncAt, listSetupCards } from "@/lib/setups/cards";

export async function GET() {
  // Always read the live feed; never prerender it at build time.
  await connection();
  const [setups, lastSyncAt] = await Promise.all([listSetupCards(), getLastSyncAt()]);
  const response: SetupsResponse = { setups, lastSyncAt };
  return Response.json(response);
}
