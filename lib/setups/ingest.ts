// The ingest job behind /api/ingest. Each run:
//   1. Recent Search per tracked creator since the stored cursor. The batch is
//      stored and the cursor advanced in one transaction, so a crash never
//      skips posts.
//   2. Extracts pending and failed posts, oldest first so originals are
//      processed before replies to them.
//   3. Every few minutes, rechecks that setup source posts are still on X.

import { and, asc, eq, inArray, lt } from "drizzle-orm";
import { ingestState, setups, sourcePosts } from "@/db/schema";
import { getDb } from "@/lib/db";
import { getPosts, searchRecentByAuthor, XApiError } from "@/lib/x/client";
import { RECENT_SEARCH_KEY_PREFIX, trackedCreators } from "./cards";
import { MAX_EXTRACTION_ATTEMPTS, processPost } from "./pipeline";

const AVAILABILITY_KEY = "x:availability";
const AVAILABILITY_INTERVAL_MS = 10 * 60_000;
const EXTRACTIONS_PER_RUN = 10;
// The route allows 60s. Stop starting new extractions after this, so one
// slow 0G call (45s timeout) still finishes inside the limit.
const EXTRACTION_BUDGET_MS = 12_000;

export interface IngestReport {
  creators: { username: string; fetched: number; stored: number; error?: string }[];
  extracted: { postId: string; classification?: string; requestId?: string; error?: string }[];
  availability: { checked: number; unavailable: string[] } | null;
}

async function syncCreator(username: string) {
  const db = getDb();
  const key = `${RECENT_SEARCH_KEY_PREFIX}${username.toLowerCase()}`;
  const [state] = await db.select().from(ingestState).where(eq(ingestState.key, key));

  try {
    let result;
    try {
      result = await searchRecentByAuthor(username, state?.sinceId ?? null);
    } catch (err) {
      // Recent Search only covers 7 days; an older cursor is rejected. Search
      // without it; dedupe by post ID makes the overlap harmless.
      if (!(err instanceof XApiError && err.status === 400 && state?.sinceId)) throw err;
      result = await searchRecentByAuthor(username, null);
    }
    const { posts, newestId } = result;

    const stored = await db.transaction(async (tx) => {
      const inserted = posts.length
        ? await tx
            .insert(sourcePosts)
            .values(
              posts.map((p) => ({
                xPostId: p.id,
                authorId: p.authorId,
                authorUsername: p.authorUsername,
                text: p.text,
                postedAt: new Date(p.createdAt),
                conversationId: p.conversationId,
                inReplyToPostId: p.inReplyToPostId,
                raw: p.raw,
              })),
            )
            .onConflictDoNothing({ target: sourcePosts.xPostId })
            .returning({ id: sourcePosts.id })
        : [];

      const now = new Date();
      const sinceId = newestId ?? state?.sinceId ?? null;
      await tx
        .insert(ingestState)
        .values({ key, sinceId, lastSuccessAt: now, lastError: null, updatedAt: now })
        .onConflictDoUpdate({
          target: ingestState.key,
          set: { sinceId, lastSuccessAt: now, lastError: null, updatedAt: now },
        });
      return inserted.length;
    });

    return { username, fetched: posts.length, stored };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Record the error without touching the cursor or last success time.
    await db
      .insert(ingestState)
      .values({ key, lastError: message, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: ingestState.key,
        set: { lastError: message, updatedAt: new Date() },
      });
    return { username, fetched: 0, stored: 0, error: message };
  }
}

async function extractQueued(startedAt: number): Promise<IngestReport["extracted"]> {
  const queued = await getDb()
    .select()
    .from(sourcePosts)
    .where(
      and(
        inArray(sourcePosts.extractionStatus, ["pending", "failed"]),
        lt(sourcePosts.extractionAttempts, MAX_EXTRACTION_ATTEMPTS),
      ),
    )
    .orderBy(asc(sourcePosts.postedAt))
    .limit(EXTRACTIONS_PER_RUN);

  const results: IngestReport["extracted"] = [];
  for (const post of queued) {
    if (Date.now() - startedAt > EXTRACTION_BUDGET_MS) break;
    try {
      const r = await processPost(post);
      results.push({
        postId: post.xPostId,
        classification: r.classification,
        requestId: r.trace?.requestId,
      });
    } catch (err) {
      results.push({ postId: post.xPostId, error: err instanceof Error ? err.message : String(err) });
    }
  }
  return results;
}

/**
 * Marks setup source posts unavailable when X no longer returns them, and
 * available again when it does. Unavailable posts disable new copying.
 */
export async function recheckAvailability(force = false): Promise<IngestReport["availability"]> {
  const db = getDb();
  const [state] = await db.select().from(ingestState).where(eq(ingestState.key, AVAILABILITY_KEY));
  const due =
    force ||
    !state?.lastSuccessAt ||
    Date.now() - state.lastSuccessAt.getTime() >= AVAILABILITY_INTERVAL_MS;
  if (!due) return null;

  const rows = await db
    .select({ id: sourcePosts.id, xPostId: sourcePosts.xPostId })
    .from(sourcePosts)
    .innerJoin(setups, eq(setups.sourcePostId, sourcePosts.id));

  const unavailable: string[] = [];
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    const result = await getPosts(chunk.map((r) => r.xPostId));
    unavailable.push(...result.unavailable);
  }

  const now = new Date();
  const gone = new Set(unavailable);
  const goneIds = rows.filter((r) => gone.has(r.xPostId)).map((r) => r.id);
  const liveIds = rows.filter((r) => !gone.has(r.xPostId)).map((r) => r.id);

  await db.transaction(async (tx) => {
    if (goneIds.length) {
      await tx
        .update(sourcePosts)
        .set({ availability: "unavailable", availabilityCheckedAt: now })
        .where(inArray(sourcePosts.id, goneIds));
    }
    if (liveIds.length) {
      await tx
        .update(sourcePosts)
        .set({ availability: "available", availabilityCheckedAt: now })
        .where(inArray(sourcePosts.id, liveIds));
    }
    await tx
      .insert(ingestState)
      .values({ key: AVAILABILITY_KEY, lastSuccessAt: now, updatedAt: now })
      .onConflictDoUpdate({
        target: ingestState.key,
        set: { lastSuccessAt: now, lastError: null, updatedAt: now },
      });
  });

  return { checked: rows.length, unavailable };
}

export async function runIngest(): Promise<IngestReport> {
  const startedAt = Date.now();
  const creators = [];
  for (const username of trackedCreators()) creators.push(await syncCreator(username));

  const extracted = await extractQueued(startedAt);

  let availability: IngestReport["availability"] = null;
  try {
    availability = await recheckAvailability();
  } catch (err) {
    // A lookup failure must not mark anything unavailable; try again next run.
    console.error("availability recheck failed", err);
  }

  return { creators, extracted, availability };
}
