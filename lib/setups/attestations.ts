// Compact list of accepted setup versions for the Chainlink CRE attestor
// workflow (cre/setup-attestor). Kept small so it stays well under CRE's HTTP
// response limit, and stable so every DON node sees identical bytes.

import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { setups, setupVersions, sourcePosts } from "@/db/schema";
import { getDb } from "@/lib/db";
import type { VerificationStatus, VersionKind } from "@/lib/shared/types";
import { trackedCreators } from "./cards";

export interface AttestableVersion {
  setupId: string;
  versionId: string;
  versionNumber: number;
  kind: VersionKind;
  asset: string | null;
  side: string | null;
  entryCondition: string | null;
  entryPrice: string | null;
  referenceCurrency: string | null;
  target: string | null;
  invalidation: string | null;
  sourcePostId: string;
  zeroGRequestId: string;
  verificationStatus: VerificationStatus;
}

export async function listAttestableVersions(limit = 200): Promise<AttestableVersion[]> {
  const creators = trackedCreators().map((u) => u.toLowerCase());
  const rows = await getDb()
    .select({ v: setupVersions, postId: sourcePosts.xPostId })
    .from(setupVersions)
    .innerJoin(setups, eq(setups.id, setupVersions.setupId))
    .innerJoin(sourcePosts, eq(sourcePosts.id, setupVersions.sourcePostId))
    .where(
      and(
        eq(setupVersions.reviewStatus, "accepted"),
        creators.length ? inArray(sql`lower(${setups.creatorUsername})`, creators) : undefined,
      ),
    )
    // Oldest first, so a capped batch always attests history in order.
    .orderBy(asc(setupVersions.reviewedAt), asc(setupVersions.id))
    .limit(limit);

  return rows.map(({ v, postId }) => ({
    setupId: v.setupId,
    versionId: v.id,
    versionNumber: v.versionNumber!,
    kind: v.kind,
    asset: v.asset,
    side: v.side,
    entryCondition: v.entryCondition,
    entryPrice: v.entryPrice,
    referenceCurrency: v.referenceCurrency,
    target: v.target,
    invalidation: v.invalidation,
    sourcePostId: postId,
    zeroGRequestId: v.zeroGRequestId,
    verificationStatus: v.verificationStatus,
  }));
}
