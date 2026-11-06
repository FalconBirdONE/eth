// Shared types for the setup feed. Provisional until D's kickoff commit lands
// on main; the order, fill and swap types belong to B and D.
//
// Units: prices are exact decimal strings in USDC per WETH. Post IDs from X
// are always strings.

export type Classification =
  | "actionable"
  | "commentary"
  | "ambiguous"
  | "unsupported"
  | "revision_candidate";

export type EntryCondition = "at" | "at_or_below" | "at_or_above" | "market" | "unclear";

export type VerificationStatus = "verified" | "unverified" | "failed";

export type VersionKind = "initial" | "revision" | "withdrawal";

export type ReviewStatus = "accepted" | "pending" | "rejected";

export type SetupStatus = "active" | "withdrawn";

export type SourceAvailability = "available" | "unavailable";

export type SetupField =
  | "asset"
  | "side"
  | "entryCondition"
  | "entryPrice"
  | "referenceCurrency"
  | "target"
  | "invalidation";

/** The exact phrase from the post that supports each extracted field. */
export type Evidence = Partial<Record<SetupField, string>>;

export interface ZeroGTrace {
  model: string;
  requestId: string;
  /** chatID used for independent TEE verification (ZG-Res-Key or body id). */
  chatId: string | null;
  providerAddress: string | null;
  verificationStatus: VerificationStatus;
}

export interface SetupVersion {
  id: string;
  setupId: string;
  /** 1 for the original post, then 2, 3... for accepted revisions. */
  versionNumber: number | null;
  kind: VersionKind;
  reviewStatus: ReviewStatus;
  sourcePostId: string;
  sourcePostUrl: string;
  classification: Classification;
  asset: string | null;
  side: "buy" | "sell" | null;
  entryCondition: EntryCondition | null;
  /** Decimal string in USDC per WETH. */
  entryPrice: string | null;
  referenceCurrency: string | null;
  target: string | null;
  invalidation: string | null;
  evidence: Evidence;
  zeroG: ZeroGTrace;
  validationErrors: string[];
  copyable: boolean;
  createdAt: string;
}

export interface Setup {
  id: string;
  creator: { xUserId: string; username: string };
  sourcePostId: string;
  sourcePostUrl: string;
  sourceText: string;
  sourceAvailability: SourceAvailability;
  status: SetupStatus;
  currentVersionId: string | null;
  /** Accepted versions oldest first, then any pending candidates. */
  versions: SetupVersion[];
  createdAt: string;
}

export interface SetupCard {
  setupId: string;
  creator: { xUserId: string; username: string };
  status: SetupStatus;
  currentVersion: SetupVersion;
  /** Present when the setup has been revised. */
  previousVersion: SetupVersion | null;
  changedFields: SetupField[];
  sourcePostUrl: string;
  sourceText: string;
  sourceAvailability: SourceAvailability;
  evidence: Evidence;
  zeroGModel: string;
  zeroGRequestId: string;
  verificationStatus: VerificationStatus;
  /** True only when Buy Now / Copy Entry / Customize Entry may be offered. */
  copyable: boolean;
  hasPendingReview: boolean;
  lastSyncAt: string | null;
}

export interface SetupsResponse {
  setups: SetupCard[];
  lastSyncAt: string | null;
}

export interface SetupDetailResponse {
  setup: Setup;
  card: SetupCard | null;
}

export interface AnalyzeResponse {
  postId: string;
  postUrl: string;
  classification: Classification;
  /** Present when the post produced or revised a setup. */
  setup: SetupCard | null;
  /** Present for informational posts that did not become a setup. */
  note: string | null;
  zeroG: ZeroGTrace | null;
}
