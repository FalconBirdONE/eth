// Turns stored X posts into setups and setup versions. Shared by the ingest
// cron and the paste-a-link analyze route so both produce identical results.

import { and, eq, ne } from "drizzle-orm";
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

async function markDone(post: SourcePostRow, classification: Classification, trace: ZeroGTrace) {
  await getDb()
    .update(sourcePosts)
    .set({
      extractionStatus: "done",
      extractionError: null,
      extractionAttempts: post.extractionAttempts + 1,
      classification,
      zeroGRequestId: trace.requestId,
      zeroGModel: trace.model,
      zeroGVerificationStatus: trace.verificationStatus,
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
      extractionAttempts: post.extractionAttempts + 1,
      extractionError: (err instanceof Error ? err.message : String(err)).slice(0, 1000),
      ...(requestId ? { zeroGRequestId: requestId } : {}),
    })
    .where(eq(sourcePosts.id, post.id));
}

/**
 * Finds the setup a reply revises: the replied-to post must be stored, have a
 * setup, and share the reply's author. Fetches the parent from X when it has
 * not been ingested yet (common for pasted links).
 */
async function findRevisedSetup(
  reply: SourcePostRow,
): Promise<{ setup: SetupRow; parent: SourcePostRow } | null> {
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
  return setup ? { setup, parent } : null;
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

async function processReply(
  reply: SourcePostRow,
  target: { setup: SetupRow; parent: SourcePostRow },
): Promise<ProcessResult> {
  const { revisionType, terms, trace } = await extractRevision(target.parent.text, reply.text);

  if (revisionType === "none") {
    await markDone(reply, "commentary", trace);
    return {
      classification: "commentary",
      setupId: target.setup.id,
      candidateVersionId: null,
      trace,
      note: "Creator reply that does not change the setup.",
    };
  }

  // Quotes may come from either post.
  const validated = validateTerms(terms, `${target.parent.text}\n${reply.text}`, {
    actionable: revisionType === "update",
    verificationStatus: trace.verificationStatus,
  });

  const [candidate] = await getDb()
    .insert(setupVersions)
    .values({
      setupId: target.setup.id,
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
    setupId: target.setup.id,
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
    const target = await findRevisedSetup(post);
    return target ? await processReply(post, target) : await processOriginal(post);
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
