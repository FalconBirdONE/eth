// Team review of revision and withdrawal candidates. Accepting a candidate
// numbers it, and moves the setup's current-version pointer in the same
// transaction. Orders reference the version they were signed against, so
// nothing here touches an existing order's price, size, expiry or version.

import { and, eq, max } from "drizzle-orm";
import { setups, setupVersions } from "@/db/schema";
import { getDb } from "@/lib/db";

export class ReviewError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function reviewCandidate(
  setupId: string,
  versionId: string,
  action: "accept" | "reject",
): Promise<{ versionId: string; versionNumber: number | null; setupStatus: string }> {
  return getDb().transaction(async (tx) => {
    // Lock the setup so two reviewers cannot both take the next number.
    const [setup] = await tx.select().from(setups).where(eq(setups.id, setupId)).for("update");
    if (!setup) throw new ReviewError("setup not found", 404);

    const [candidate] = await tx
      .select()
      .from(setupVersions)
      .where(and(eq(setupVersions.id, versionId), eq(setupVersions.setupId, setupId)));
    if (!candidate) throw new ReviewError("version not found on this setup", 404);
    if (candidate.reviewStatus !== "pending") {
      throw new ReviewError(`version is already ${candidate.reviewStatus}`, 409);
    }

    if (action === "reject") {
      await tx
        .update(setupVersions)
        .set({ reviewStatus: "rejected", reviewedAt: new Date() })
        .where(eq(setupVersions.id, versionId));
      return { versionId, versionNumber: null, setupStatus: setup.status };
    }

    const [{ latest }] = await tx
      .select({ latest: max(setupVersions.versionNumber) })
      .from(setupVersions)
      .where(eq(setupVersions.setupId, setupId));
    const versionNumber = (latest ?? 0) + 1;

    await tx
      .update(setupVersions)
      .set({ reviewStatus: "accepted", versionNumber, reviewedAt: new Date() })
      .where(eq(setupVersions.id, versionId));

    // An explicit update after a withdrawal reinstates the setup.
    const setupStatus = candidate.kind === "withdrawal" ? "withdrawn" : "active";
    await tx
      .update(setups)
      .set({ currentVersionId: versionId, status: setupStatus, updatedAt: new Date() })
      .where(eq(setups.id, setupId));

    return { versionId, versionNumber, setupStatus };
  });
}
