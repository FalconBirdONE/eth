// Reviewer script for revision and withdrawal candidates.
//
//   npx tsx --env-file=.env.local lib/setups/review-cli.ts                    list pending
//   npx tsx --env-file=.env.local lib/setups/review-cli.ts accept <versionId>
//   npx tsx --env-file=.env.local lib/setups/review-cli.ts reject <versionId>

import { eq } from "drizzle-orm";
import { setups, setupVersions, sourcePosts } from "@/db/schema";
import { getDb } from "@/lib/db";
import { reviewCandidate } from "./review";

async function listPending() {
  const rows = await getDb()
    .select({ version: setupVersions, reply: sourcePosts, setup: setups })
    .from(setupVersions)
    .innerJoin(sourcePosts, eq(sourcePosts.id, setupVersions.sourcePostId))
    .innerJoin(setups, eq(setups.id, setupVersions.setupId))
    .where(eq(setupVersions.reviewStatus, "pending"));

  if (rows.length === 0) console.log("No pending candidates.");
  for (const { version: v, reply, setup } of rows) {
    console.log(`${v.id}  ${v.kind}  setup ${setup.id} (@${setup.creatorUsername})`);
    console.log(`  reply:  ${reply.text.replace(/\s+/g, " ")}`);
    console.log(`  terms:  ${v.side ?? "-"} ${v.asset ?? "-"} ${v.entryCondition ?? "-"} ${v.entryPrice ?? "-"} ${v.referenceCurrency ?? ""}`);
    console.log(`  0G:     ${v.zeroGModel} ${v.zeroGRequestId} ${v.verificationStatus}  copyable=${v.copyable}`);
    if (v.validationErrors.length) console.log(`  issues: ${v.validationErrors.join("; ")}`);
  }
}

async function main() {
  const [action, versionId] = process.argv.slice(2);
  if (!action) return listPending();
  if ((action !== "accept" && action !== "reject") || !versionId) {
    throw new Error("usage: review-cli.ts [accept|reject <versionId>]");
  }

  const [version] = await getDb().select().from(setupVersions).where(eq(setupVersions.id, versionId));
  if (!version) throw new Error(`no version ${versionId}`);
  console.log(await reviewCandidate(version.setupId, versionId, action));
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
