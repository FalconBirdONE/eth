import { connection } from "next/server";
import { listAttestableVersions } from "@/lib/setups/attestations";

// Read by the Chainlink CRE attestor workflow (cre/setup-attestor).
export async function GET() {
  await connection();
  return Response.json({ versions: await listAttestableVersions() });
}
