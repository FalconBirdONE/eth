import { hasBearerSecret, unauthorized } from "@/lib/setups/auth";
import { runIngest } from "@/lib/setups/ingest";

export const maxDuration = 60;

// Called about every minute by Supabase Cron with the CRON_SECRET header.
export async function POST(request: Request) {
  if (!hasBearerSecret(request, "CRON_SECRET")) return unauthorized();

  const report = await runIngest();
  const failed = report.creators.some((c) => c.error);
  return Response.json(report, { status: failed ? 502 : 200 });
}
