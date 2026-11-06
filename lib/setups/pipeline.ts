// Turns stored X posts into setups and setup versions. Shared by the ingest
// cron and the paste-a-link analyze route so both produce identical results.

import { and, asc, eq, ne, sql } from "drizzle-orm";
import { setups, setupVersions, sourcePosts } from "@/db/schema";
import { getDb } from "@/lib/db";
import type { Classification, ZeroGTrace } from "@/lib/shared/types";
import { getPost, type XPost } from "@/lib/x/client";
import { ExtractionParseError, extractRevision, extractSetup } from "@/lib/zerog/extract";
import { ZeroGError } from "@/lib/zerog/client";
import { validateTerms, type ValidatedTerms } from "./validate";

export type SourcePostRow = typeof sourcePosts.$inferSelect;
export type SetupRow = typeof setups.$inferSelect;

export const MAX_EXTRACTION_ATTEMPTS = 5;

export interface ProcessResult {
  classification: Classification;
  setupId: string | null;
  /** Set when a revision or withdrawal candidate was created for review. */
  candidateVersionId: string | null;
  trace: ZeroGTrace | null;
  note: string | null;
}

/** Inserts the post if new; returns the stored row either way. */
export async function upsertSourcePost(post: XPost): Promise<SourcePostRow> {
  const db = getDb();
  const [inserted] = await db
    .insert(sourcePosts)
    .values({
      xPostId: post.id,
      authorId: post.authorId,
      authorUsername: post.authorUsername,
      text: post.text,
      postedAt: new Date(post.createdAt),
      conversationId: post.conversationId,
      inReplyToPostId: post.inReplyToPostId,
      raw: post.raw,
    })
    .onConflictDoNothing({ target: sourcePosts.xPostId })
    .returning();
  if (inserted) return inserted;

  const [existing] = await db.select().from(sourcePosts).where(eq(sourcePosts.xPostId, post.id));
  return existing;
}

function versionValues(
  v: ValidatedTerms,
  trace: ZeroGTrace,
): Omit<
  typeof setupVersions.$inferInsert,
  "setupId" | "kind" | "reviewStatus" | "sourcePostId" | "classification" | "versionNumber"
> {
  return {
    asset: v.asset,
    side: v.side,
    entryCondition: v.entryCondition,
    entryPrice: v.entryPrice,
    referenceCurrency: v.referenceCurrency,
    target: v.target,
    invalidation: v.invalidation,
    evidence: v.evidence,
    zeroGModel: trace.model,
    zeroGRequestId: trace.requestId,
    zeroGChatId: trace.chatId,
    zeroGProvider: trace.providerAddress,
    verificationStatus: trace.verificationStatus,
    validationErrors: v.errors,
    copyable: v.copyable,
  };
}

function appendRequestId(requestId: string) {
  return sql`${sourcePosts.zeroGRequestIds} || ${JSON.stringify([requestId])}::jsonb`;
}

async function markDone(post: SourcePostRow, classification: Classification, trace: ZeroGTrace) {
  await getDb()
    .update(sourcePosts)
    .set({
      extractionStatus: "done",
      extractionError: null,
      extractionAttempts: sql`${sourcePosts.extractionAttempts} + 1`,
      classification,
      zeroGRequestId: trace.requestId,
      zeroGModel: trace.model,
      zeroGVerificationStatus: trace.verificationStatus,
      zeroGRequestIds: appendRequestId(trace.requestId),
    })
    .where(eq(sourcePosts.id, post.id));
}

const NOTES: Partial<Record<Classification, string>> = {
  commentary: "Commentary, not a trade setup.",
  revision_candidate: "Revision candidate for team review.",
};

async function markFailed(post: SourcePostRow, err: unknown) {
  const requestId =
    err instanceof ZeroGError ? err.requestId : err instanceof ExtractionParseError ? err.trace.requestId : null;
  await getDb()
    .update(sourcePosts)
    .set({
      extractionStatus: "failed",
      extractionAttempts: sql`${sourcePosts.extractionAttempts} + 1`,
      extractionError: (err instanceof Error ? err.message : String(err)).slice(0, 1000),
      ...(requestId
        ? { zeroGRequestId: requestId, zeroGRequestIds: appendRequestId(requestId) }
        : {}),
    })
    .where(eq(sourcePosts.id, post.id));
}

/**
 * Finds the setup a reply revises. The replied-to post must share the reply's
 * author and be either the setup's original post or a creator reply already
 * stored as one of its versions (so a thread of updates stays on one setup).
 * Fetches the parent from X when it has not been ingested yet (common for
 * pasted links).
 */
async function findRevisedSetup(reply: SourcePostRow): Promise<SetupRow | null> {
  if (!reply.inReplyToPostId) return null;
  const db = getDb();

  let [parent] = await db
    .select()
    .from(sourcePosts)
    .where(eq(sourcePosts.xPostId, reply.inReplyToPostId));

  if (!parent) {
    const fetched = await getPost(reply.inReplyToPostId);
    if (!fetched || fetched.authorId !== reply.authorId) return null;
    parent = await upsertSourcePost(fetched);
  }
  if (parent.authorId !== reply.authorId) return null;
  if (parent.extractionStatus !== "done") await processPost(parent);

  const [setup] = await db.select().from(setups).where(eq(setups.sourcePostId, parent.id));
  if (setup) return setup;

  const [viaVersion] = await db
    .select({ setup: setups })
    .from(setupVersions)
    .innerJoin(setups, eq(setups.id, setupVersions.setupId))
    .where(and(eq(setupVersions.sourcePostId, parent.id), ne(setupVersions.reviewStatus, "rejected")));
  return viaVersion?.setup ?? null;
}

async function processOriginal(post: SourcePostRow): Promise<ProcessResult> {
  const { classification, terms, trace } = await extractSetup(post.text);
  const validated = validateTerms(terms, post.text, {
    actionable: classification === "actionable",
    verificationStatus: trace.verificationStatus,
  });

  // Commentary and orphan revisions are recorded but never become setups.
  if (classification === "commentary" || classification === "revision_candidate") {
    await markDone(post, classification, trace);
    return {
      classification,
      setupId: null,
      candidateVersionId: null,
      trace,
      note:
        classification === "commentary"
          ? NOTES.commentary!
          : "Looks like a revision, but not of a setup we track.",
    };
  }

  const db = getDb();
  const setupId = await db.transaction(async (tx) => {
    const [setup] = await tx
      .insert(setups)
      .values({ sourcePostId: post.id, creatorXId: post.authorId, creatorUsername: post.authorUsername })
      .onConflictDoNothing({ target: setups.sourcePostId })
      .returning();
    // Another run already created it.
    if (!setup) {
      const [existing] = await tx.select().from(setups).where(eq(setups.sourcePostId, post.id));
      return existing.id;
    }

    const [version] = await tx
      .insert(setupVersions)
      .values({
        setupId: setup.id,
        versionNumber: 1,
        kind: "initial",
        reviewStatus: "accepted",
        sourcePostId: post.id,
        classification,
        reviewedAt: new Date(),
        ...versionValues(validated, trace),
      })
      .returning();
    await tx.update(setups).set({ currentVersionId: version.id }).where(eq(setups.id, setup.id));
    return setup.id;
  });

  await markDone(post, classification, trace);
  return {
    classification,
    setupId,
    candidateVersionId: null,
    trace,
    note: validated.copyable ? null : `Informational only: ${validated.errors.join("; ")}`,
  };
}

type VersionRow = typeof setupVersions.$inferSelect;

/** A version's terms in the extraction's field names, for the revision prompt. */
function termsOf(v: VersionRow) {
  return {
    asset: v.asset,
    side: v.side,
    entry_condition: v.entryCondition,
    entry_price: v.entryPrice,
    reference_currency: v.referenceCurrency,
    target: v.target,
    invalidation: v.invalidation,
  };
}

const EVIDENCE_KEYS = {
  asset: "asset",
  side: "side",
  entry_condition: "entryCondition",
  entry_price: "entryPrice",
  reference_currency: "referenceCurrency",
  target: "target",
  invalidation: "invalidation",
} as const;

async function processReply(reply: SourcePostRow, setup: SetupRow): Promise<ProcessResult> {
  const db = getDb();
  // The thread so far: the original post and every accepted revision, oldest first.
  const accepted = await db
    .select({ version: setupVersions, post: sourcePosts })
    .from(setupVersions)
    .innerJoin(sourcePosts, eq(sourcePosts.id, setupVersions.sourcePostId))
    .where(and(eq(setupVersions.setupId, setup.id), eq(setupVersions.reviewStatus, "accepted")))
    .orderBy(asc(setupVersions.versionNumber));
  const current = accepted.find((r) => r.version.id === setup.currentVersionId)?.version ?? null;
  const earlierPosts = [...new Set(accepted.map((r) => r.post.text))];

  const { revisionType, terms, trace } = await extractRevision(
    { earlierPosts, currentTerms: current ? termsOf(current) : null },
    reply.text,
  );

  if (revisionType === "none") {
    await markDone(reply, "commentary", trace);
    return {
      classification: "commentary",
      setupId: setup.id,
      candidateVersionId: null,
      trace,
      note: "Creator reply that does not change the setup.",
    };
  }

  // A field carried over unchanged keeps the quote that supported it before.
  if (current) {
    const before = termsOf(current);
    for (const key of Object.keys(EVIDENCE_KEYS) as (keyof typeof EVIDENCE_KEYS)[]) {
      if (!terms.evidence[key] && terms[key] !== null && terms[key] === before[key]) {
        terms.evidence[key] = current.evidence[EVIDENCE_KEYS[key]] ?? null;
      }
    }
  }

  // Quotes may come from any post in the thread.
  const validated = validateTerms(terms, [...earlierPosts, reply.text].join("\n"), {
    actionable: revisionType === "update",
    verificationStatus: trace.verificationStatus,
  });

  const [candidate] = await db
    .insert(setupVersions)
    .values({
      setupId: setup.id,
      versionNumber: null,
      kind: revisionType === "withdrawal" ? "withdrawal" : "revision",
      reviewStatus: "pending",
      sourcePostId: reply.id,
      classification: "revision_candidate",
      ...versionValues(validated, trace),
      copyable: revisionType === "update" && validated.copyable,
    })
    .onConflictDoNothing({ target: [setupVersions.setupId, setupVersions.sourcePostId] })
    .returning();

  await markDone(reply, "revision_candidate", trace);
  return {
    classification: "revision_candidate",
    setupId: setup.id,
    candidateVersionId: candidate?.id ?? null,
    trace,
    note:
      revisionType === "withdrawal"
        ? "Candidate withdrawal, waiting for team review."
        : "Candidate revision, waiting for team review.",
  };
}

/**
 * Extracts one stored post. Already-processed posts return their stored
 * outcome without calling 0G again. Failures are recorded for retry and
 * rethrown.
 */
export async function processPost(post: SourcePostRow): Promise<ProcessResult> {
  if (post.extractionStatus === "done") return storedResult(post);

  try {
    const setup = await findRevisedSetup(post);
    return setup ? await processReply(post, setup) : await processOriginal(post);
  } catch (err) {
    await markFailed(post, err);
    throw err;
  }
}

async function storedResult(post: SourcePostRow): Promise<ProcessResult> {
  const db = getDb();
  const [setup] = await db.select().from(setups).where(eq(setups.sourcePostId, post.id));
  // A creator reply is stored as a version of the setup it revises.
  const [version] = await db
    .select()
    .from(setupVersions)
    .where(and(eq(setupVersions.sourcePostId, post.id), ne(setupVersions.kind, "initial")));
  const classification = post.classification ?? "commentary";
  return {
    classification,
    setupId: setup?.id ?? version?.setupId ?? null,
    candidateVersionId: version?.reviewStatus === "pending" ? version.id : null,
    trace:
      post.zeroGRequestId && post.zeroGModel
        ? {
            model: post.zeroGModel,
            requestId: post.zeroGRequestId,
            chatId: null,
            providerAddress: null,
            verificationStatus: post.zeroGVerificationStatus ?? "unverified",
          }
        : null,
    note: NOTES[classification] ?? null,
  };
}
