// Read side of the feed: builds SetupCard and Setup responses from rows.

import { desc, eq, inArray, like, max, sql } from "drizzle-orm";
import { ingestState, setups, setupVersions, sourcePosts } from "@/db/schema";
import { getDb } from "@/lib/db";
import type { Setup, SetupCard, SetupField, SetupVersion } from "@/lib/shared/types";
import { postUrl } from "@/lib/x/client";
import type { SetupRow, SourcePostRow } from "./pipeline";

type VersionRow = typeof setupVersions.$inferSelect;

const COMPARED_FIELDS: SetupField[] = [
  "asset",
  "side",
  "entryCondition",
  "entryPrice",
  "referenceCurrency",
  "target",
  "invalidation",
];

export const RECENT_SEARCH_KEY_PREFIX = "x:recent:";

export function trackedCreators(): string[] {
  return (process.env.X_CREATOR_USERNAMES ?? "")
    .split(",")
    .map((s) => s.trim().replace(/^@/, ""))
    .filter(Boolean);
}

function urlFor(post: SourcePostRow): string {
  return postUrl(post.authorUsername, post.xPostId);
}

function toVersion(row: VersionRow, posts: Map<string, SourcePostRow>): SetupVersion {
  const post = posts.get(row.sourcePostId)!;
  return {
    id: row.id,
    setupId: row.setupId,
    versionNumber: row.versionNumber,
    kind: row.kind,
    reviewStatus: row.reviewStatus,
    sourcePostId: post.xPostId,
    sourcePostUrl: urlFor(post),
    classification: row.classification,
    asset: row.asset,
    side: row.side,
    entryCondition: row.entryCondition,
    entryPrice: row.entryPrice,
    referenceCurrency: row.referenceCurrency,
    target: row.target,
    invalidation: row.invalidation,
    evidence: row.evidence,
    zeroG: {
      model: row.zeroGModel,
      requestId: row.zeroGRequestId,
      chatId: row.zeroGChatId,
      providerAddress: row.zeroGProvider,
      verificationStatus: row.verificationStatus,
    },
    validationErrors: row.validationErrors,
    copyable: row.copyable,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Accepted versions in order, then pending candidates. Rejected are omitted. */
function orderVersions(rows: VersionRow[]): VersionRow[] {
  const accepted = rows
    .filter((v) => v.reviewStatus === "accepted")
    .sort((a, b) => a.versionNumber! - b.versionNumber!);
  const pending = rows
    .filter((v) => v.reviewStatus === "pending")
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  return [...accepted, ...pending];
}

function toCard(
  setup: SetupRow,
  versions: SetupVersion[],
  origin: SourcePostRow,
  lastSyncAt: string | null,
): SetupCard | null {
  const current = versions.find((v) => v.id === setup.currentVersionId);
  if (!current) return null;

  const previous =
    versions
      .filter(
        (v) =>
          v.reviewStatus === "accepted" &&
          v.versionNumber !== null &&
          v.versionNumber < current.versionNumber!,
      )
      .at(-1) ?? null;

  const changedFields = previous
    ? COMPARED_FIELDS.filter((f) => previous[f] !== current[f])
    : [];

  return {
    setupId: setup.id,
    creator: { xUserId: setup.creatorXId, username: setup.creatorUsername },
    status: setup.status,
    currentVersion: current,
    previousVersion: previous,
    changedFields,
    sourcePostUrl: urlFor(origin),
    sourceText: origin.text,
    sourceAvailability: origin.availability,
    evidence: current.evidence,
    zeroGModel: current.zeroG.model,
    zeroGRequestId: current.zeroG.requestId,
    verificationStatus: current.zeroG.verificationStatus,
    copyable:
      current.copyable &&
      current.reviewStatus === "accepted" &&
      setup.status === "active" &&
      origin.availability === "available",
    hasPendingReview: versions.some((v) => v.reviewStatus === "pending"),
    lastSyncAt,
  };
}

export async function getLastSyncAt(): Promise<string | null> {
  const [row] = await getDb()
    .select({ at: max(ingestState.lastSuccessAt) })
    .from(ingestState)
    .where(like(ingestState.key, `${RECENT_SEARCH_KEY_PREFIX}%`));
  return row?.at ? new Date(row.at).toISOString() : null;
}

async function loadRelated(setupRows: SetupRow[]) {
  const db = getDb();
  const ids = setupRows.map((s) => s.id);
  const versionRows = ids.length
    ? await db.select().from(setupVersions).where(inArray(setupVersions.setupId, ids))
    : [];
  const postIds = [
    ...new Set([...setupRows.map((s) => s.sourcePostId), ...versionRows.map((v) => v.sourcePostId)]),
  ];
  const postRows = postIds.length
    ? await db.select().from(sourcePosts).where(inArray(sourcePosts.id, postIds))
    : [];
  return { versionRows, posts: new Map(postRows.map((p) => [p.id, p])) };
}

/**
 * The terminal feed: setups from tracked creators only, so a pasted link
 * from any other account is analyzed but does not join the feed. With no
 * creators configured, every setup is listed.
 */
export async function listSetupCards(limit = 50): Promise<SetupCard[]> {
  const creators = trackedCreators().map((u) => u.toLowerCase());
  const setupRows = await getDb()
    .select()
    .from(setups)
    .where(creators.length ? inArray(sql`lower(${setups.creatorUsername})`, creators) : undefined)
    .orderBy(desc(setups.updatedAt))
    .limit(limit);
  const [{ versionRows, posts }, lastSyncAt] = await Promise.all([
    loadRelated(setupRows),
    getLastSyncAt(),
  ]);

  return setupRows.flatMap((setup) => {
    const versions = orderVersions(versionRows.filter((v) => v.setupId === setup.id)).map((v) =>
      toVersion(v, posts),
    );
    const card = toCard(setup, versions, posts.get(setup.sourcePostId)!, lastSyncAt);
    return card ? [card] : [];
  });
}

export async function getSetupCard(setupId: string): Promise<SetupCard | null> {
  const detail = await loadSetup(setupId);
  return detail?.card ?? null;
}

/** One setup with every version, plus its card for convenience. */
export async function loadSetup(
  setupId: string,
): Promise<{ setup: Setup; card: SetupCard | null } | null> {
  const [setup] = await getDb().select().from(setups).where(eq(setups.id, setupId));
  if (!setup) return null;

  const [{ versionRows, posts }, lastSyncAt] = await Promise.all([
    loadRelated([setup]),
    getLastSyncAt(),
  ]);
  const versions = orderVersions(versionRows).map((v) => toVersion(v, posts));
  const origin = posts.get(setup.sourcePostId)!;

  return {
    setup: {
      id: setup.id,
      creator: { xUserId: setup.creatorXId, username: setup.creatorUsername },
      sourcePostId: origin.xPostId,
      sourcePostUrl: urlFor(origin),
      sourceText: origin.text,
      sourceAvailability: origin.availability,
      status: setup.status,
      currentVersionId: setup.currentVersionId,
      versions,
      createdAt: setup.createdAt.toISOString(),
    },
    card: toCard(setup, versions, origin, lastSyncAt),
  };
}
