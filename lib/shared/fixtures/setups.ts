// FIXTURE: sample responses for A's setup feed, for building the frontend
// before the live routes are ready. Live API routes never import this file.
// Every ID, request ID and post below is made up.

import type {
  AnalyzeResponse,
  SetupCard,
  SetupDetailResponse,
  SetupVersion,
  SetupsResponse,
  ZeroGTrace,
} from "../types";

const CREATOR = { xUserId: "1700000000000000001", username: "demo_creator" };
const SYNC = "2026-11-06T18:30:00.000Z";

function trace(requestId: string, verificationStatus: ZeroGTrace["verificationStatus"] = "verified"): ZeroGTrace {
  return {
    model: "glm-5.2",
    requestId,
    chatId: `chatcmpl-${requestId.slice(0, 8)}`,
    providerAddress: "0x00000000000000000000000000000000000000f1",
    verificationStatus,
  };
}

function version(overrides: Partial<SetupVersion> & Pick<SetupVersion, "id" | "setupId">): SetupVersion {
  return {
    versionNumber: 1,
    kind: "initial",
    reviewStatus: "accepted",
    sourcePostId: "1855000000000000001",
    sourcePostUrl: "https://x.com/demo_creator/status/1855000000000000001",
    classification: "actionable",
    asset: "ETH",
    side: "buy",
    entryCondition: "at_or_below",
    entryPrice: "2400",
    referenceCurrency: "USD",
    target: "2800",
    invalidation: "2250",
    evidence: {
      asset: "$ETH",
      side: "bidding",
      entryCondition: "bidding $ETH at",
      entryPrice: "$2,400",
      referenceCurrency: "$2,400",
      target: "Target 2,800",
      invalidation: "invalidation below 2,250",
    },
    zeroG: trace("0852f405-6c56-40c2-a800-e6fd70785065"),
    validationErrors: [],
    copyable: true,
    createdAt: "2026-11-06T15:02:11.000Z",
    ...overrides,
  };
}

// 1. A revised setup: v1 at $2,400, accepted v2 at $2,350 from the creator's reply.
const REVISED_ID = "5b3f8f9e-1a2b-4c3d-8e9f-000000000001";
const revisedV1 = version({ id: "a1000000-0000-4000-8000-000000000001", setupId: REVISED_ID });
const revisedV2 = version({
  id: "a1000000-0000-4000-8000-000000000002",
  setupId: REVISED_ID,
  versionNumber: 2,
  kind: "revision",
  sourcePostId: "1855000000000000002",
  sourcePostUrl: "https://x.com/demo_creator/status/1855000000000000002",
  classification: "revision_candidate",
  entryPrice: "2350",
  evidence: { ...revisedV1.evidence, entryPrice: "$2,350", entryCondition: "moving my $ETH entry down to" },
  zeroG: trace("1f7c2a90-3b4d-4e5f-9a0b-c1d2e3f40002"),
  createdAt: "2026-11-06T17:40:05.000Z",
});

const SOURCE_TEXT = "New setup: bidding $ETH at $2,400. Target 2,800, invalidation below 2,250.";

export const revisedSetupCard: SetupCard = {
  setupId: REVISED_ID,
  creator: CREATOR,
  status: "active",
  currentVersion: revisedV2,
  previousVersion: revisedV1,
  changedFields: ["entryPrice"],
  sourcePostUrl: revisedV1.sourcePostUrl,
  sourceText: SOURCE_TEXT,
  sourceAvailability: "available",
  evidence: revisedV2.evidence,
  zeroGModel: revisedV2.zeroG.model,
  zeroGRequestId: revisedV2.zeroG.requestId,
  verificationStatus: "verified",
  copyable: true,
  hasPendingReview: false,
  lastSyncAt: SYNC,
};

// 2. A fresh actionable setup, unverified by 0G (still copyable, labelled).
const FRESH_ID = "5b3f8f9e-1a2b-4c3d-8e9f-000000000002";
const freshV1 = version({
  id: "a2000000-0000-4000-8000-000000000001",
  setupId: FRESH_ID,
  sourcePostId: "1855000000000000010",
  sourcePostUrl: "https://x.com/demo_creator/status/1855000000000000010",
  entryCondition: "at",
  entryPrice: "2412.5",
  target: null,
  invalidation: "2300",
  evidence: {
    asset: "ETH",
    side: "Long",
    entryCondition: "Long ETH at",
    entryPrice: "2412.5",
    referenceCurrency: "USDC",
    invalidation: "stop 2300",
  },
  zeroG: trace("2e8d3b01-4c5e-4f60-8b1c-d2e3f4050003", "unverified"),
  createdAt: "2026-11-06T18:21:44.000Z",
});

export const freshSetupCard: SetupCard = {
  setupId: FRESH_ID,
  creator: CREATOR,
  status: "active",
  currentVersion: freshV1,
  previousVersion: null,
  changedFields: [],
  sourcePostUrl: freshV1.sourcePostUrl,
  sourceText: "Long ETH at 2412.5 USDC, stop 2300. Small size.",
  sourceAvailability: "available",
  evidence: freshV1.evidence,
  zeroGModel: "glm-5.2",
  zeroGRequestId: freshV1.zeroG.requestId,
  verificationStatus: "unverified",
  copyable: true,
  hasPendingReview: false,
  lastSyncAt: SYNC,
};

// 3. Target only: informational, never copyable.
const TARGET_ID = "5b3f8f9e-1a2b-4c3d-8e9f-000000000003";
const targetV1 = version({
  id: "a3000000-0000-4000-8000-000000000001",
  setupId: TARGET_ID,
  sourcePostId: "1855000000000000020",
  sourcePostUrl: "https://x.com/demo_creator/status/1855000000000000020",
  classification: "unsupported",
  side: null,
  entryCondition: null,
  entryPrice: null,
  referenceCurrency: null,
  target: "3000",
  invalidation: null,
  evidence: { asset: "$ETH", target: "heading to 3,000" },
  zeroG: trace("3f9e4c12-5d6f-4071-9c2d-e3f405160004"),
  validationErrors: [
    "post is not an actionable setup",
    "no explicit entry price",
    "side missing is not a buy",
    "entry condition missing is not a limit buy",
    "reference currency missing is not USD/USDC",
  ],
  copyable: false,
  createdAt: "2026-11-06T16:10:00.000Z",
});

export const targetOnlySetupCard: SetupCard = {
  setupId: TARGET_ID,
  creator: CREATOR,
  status: "active",
  currentVersion: targetV1,
  previousVersion: null,
  changedFields: [],
  sourcePostUrl: targetV1.sourcePostUrl,
  sourceText: "$ETH is heading to 3,000 this month. Mark my words.",
  sourceAvailability: "available",
  evidence: targetV1.evidence,
  zeroGModel: "glm-5.2",
  zeroGRequestId: targetV1.zeroG.requestId,
  verificationStatus: "verified",
  copyable: false,
  hasPendingReview: false,
  lastSyncAt: SYNC,
};

// 4. A valid setup whose source post was deleted: copy disabled.
const GONE_ID = "5b3f8f9e-1a2b-4c3d-8e9f-000000000004";
const goneV1 = version({
  id: "a4000000-0000-4000-8000-000000000001",
  setupId: GONE_ID,
  sourcePostId: "1855000000000000030",
  sourcePostUrl: "https://x.com/demo_creator/status/1855000000000000030",
  zeroG: trace("4a0f5d23-6e70-4182-8d3e-f40516270005"),
  createdAt: "2026-11-06T14:00:00.000Z",
});

export const unavailableSetupCard: SetupCard = {
  ...revisedSetupCard,
  setupId: GONE_ID,
  currentVersion: goneV1,
  previousVersion: null,
  changedFields: [],
  sourcePostUrl: goneV1.sourcePostUrl,
  sourceAvailability: "unavailable",
  evidence: goneV1.evidence,
  zeroGRequestId: goneV1.zeroG.requestId,
  copyable: false,
};

// 5. A setup with a pending withdrawal candidate (v1 still current and copyable).
const PENDING_ID = "5b3f8f9e-1a2b-4c3d-8e9f-000000000005";
const pendingV1 = version({
  id: "a5000000-0000-4000-8000-000000000001",
  setupId: PENDING_ID,
  sourcePostId: "1855000000000000040",
  sourcePostUrl: "https://x.com/demo_creator/status/1855000000000000040",
  zeroG: trace("5b1a6e34-7f81-4293-9e4f-051627380006"),
});
const pendingWithdrawal = version({
  id: "a5000000-0000-4000-8000-000000000002",
  setupId: PENDING_ID,
  versionNumber: null,
  kind: "withdrawal",
  reviewStatus: "pending",
  sourcePostId: "1855000000000000041",
  sourcePostUrl: "https://x.com/demo_creator/status/1855000000000000041",
  classification: "revision_candidate",
  zeroG: trace("6c2b7f45-8092-43a4-8f50-162738490007"),
  copyable: false,
  createdAt: "2026-11-06T18:05:00.000Z",
});

export const pendingWithdrawalSetupCard: SetupCard = {
  ...revisedSetupCard,
  setupId: PENDING_ID,
  currentVersion: pendingV1,
  previousVersion: null,
  changedFields: [],
  sourcePostUrl: pendingV1.sourcePostUrl,
  evidence: pendingV1.evidence,
  zeroGRequestId: pendingV1.zeroG.requestId,
  hasPendingReview: true,
};

export const setupsFixture: SetupsResponse = {
  setups: [
    freshSetupCard,
    revisedSetupCard,
    pendingWithdrawalSetupCard,
    targetOnlySetupCard,
    unavailableSetupCard,
  ],
  lastSyncAt: SYNC,
};

/** GET /api/setups/[id] for the revised setup. */
export const setupDetailFixture: SetupDetailResponse = {
  setup: {
    id: REVISED_ID,
    creator: CREATOR,
    sourcePostId: revisedV1.sourcePostId,
    sourcePostUrl: revisedV1.sourcePostUrl,
    sourceText: SOURCE_TEXT,
    sourceAvailability: "available",
    status: "active",
    currentVersionId: revisedV2.id,
    versions: [revisedV1, revisedV2],
    createdAt: revisedV1.createdAt,
  },
  card: revisedSetupCard,
};

/** POST /api/analyze for an actionable post and for a commentary post. */
export const analyzeFixtures: { actionable: AnalyzeResponse; commentary: AnalyzeResponse } = {
  actionable: {
    postId: freshV1.sourcePostId,
    postUrl: freshV1.sourcePostUrl,
    classification: "actionable",
    setup: freshSetupCard,
    note: null,
    zeroG: freshV1.zeroG,
  },
  commentary: {
    postId: "1855000000000000050",
    postUrl: "https://x.com/demo_creator/status/1855000000000000050",
    classification: "commentary",
    setup: null,
    note: "Commentary, not a trade setup.",
    zeroG: trace("7d3c8056-91a3-44b5-9061-27384950a008"),
  },
};
