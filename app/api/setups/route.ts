import type { SetupsResponse } from "@/lib/shared/types";
import { getLastSyncAt, listSetupCards } from "@/lib/setups/cards";

export async function GET() {
  const [setups, lastSyncAt] = await Promise.all([listSetupCards(), getLastSyncAt()]);
  const response: SetupsResponse = { setups, lastSyncAt };
  return Response.json(response);
}
