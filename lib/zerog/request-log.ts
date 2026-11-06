// Prints every 0G request ID we have recorded, for the 0G submission.
//
//   npx tsx --env-file=.env.local lib/zerog/request-log.ts [--json]

import { asc, eq, isNotNull } from "drizzle-orm";
import { setupVersions, sourcePosts } from "@/db/schema";
import { getDb } from "@/lib/db";
import { postUrl } from "@/lib/x/client";

async function main() {
  const db = getDb();

  // Setup versions keep the full trace; source_posts covers commentary and
  // failed extractions that never became a version.
  const versions = await db
    .select({ v: setupVersions, post: sourcePosts })
    .from(setupVersions)
    .innerJoin(sourcePosts, eq(sourcePosts.id, setupVersions.sourcePostId))
    .orderBy(asc(setupVersions.createdAt));
  const posts = await db
    .select()
    .from(sourcePosts)
    .where(isNotNull(sourcePosts.zeroGRequestId))
    .orderBy(asc(sourcePosts.fetchedAt));

  const seen = new Set<string>();
  const rows = [
    ...versions.map(({ v, post }) => ({
      requestId: v.zeroGRequestId,
      chatId: v.zeroGChatId,
      model: v.zeroGModel,
      provider: v.zeroGProvider,
      verification: v.verificationStatus,
      outcome: `${v.kind} ${v.reviewStatus}${v.entryPrice ? ` @ ${v.entryPrice}` : ""}`,
      post: postUrl(post.authorUsername, post.xPostId),
    })),
    ...posts.flatMap((p) =>
      (p.zeroGRequestIds.length ? p.zeroGRequestIds : [p.zeroGRequestId!]).map((requestId) => {
        const latest = requestId === p.zeroGRequestId;
        return {
          requestId,
          chatId: null,
          model: p.zeroGModel,
          provider: null,
          verification: latest ? p.zeroGVerificationStatus : null,
          outcome: !latest
            ? "earlier failed attempt"
            : p.extractionStatus === "failed"
              ? "failed extraction"
              : (p.classification ?? ""),
          post: postUrl(p.authorUsername, p.xPostId),
        };
      }),
    ),
  ].filter((r) => !seen.has(r.requestId) && seen.add(r.requestId));

  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(rows, null, 2));
  } else {
    for (const r of rows) {
      console.log(`${r.requestId}  ${r.model}  ${r.verification ?? "-"}  ${r.outcome}  ${r.post}`);
    }
    console.log(`\n${rows.length} request IDs`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
