// FIXTURE: the six extraction test posts from the plan. Used only by
// lib/zerog/run-fixtures.ts; live routes never import this file.

import type { Classification } from "@/lib/shared/types";

const ORIGINAL =
  "New setup: bidding $ETH at $2,400. Target 2,800, invalidation below 2,250.";

export type FixturePost =
  | {
      name: string;
      kind: "post";
      text: string;
      expect: { classification: Classification[]; copyable: boolean; entryPrice?: string };
    }
  | {
      name: string;
      kind: "reply";
      original: string;
      text: string;
      expect: { revisionType: "update" | "withdrawal" | "none"; entryPrice?: string };
    };

export const FIXTURE_POSTS: FixturePost[] = [
  {
    name: "target only",
    kind: "post",
    text: "$ETH is heading to 3,000 this month. Mark my words.",
    expect: { classification: ["unsupported", "commentary"], copyable: false },
  },
  {
    name: "historical",
    kind: "post",
    text: "Bought $ETH at 2,100 last week and it's already up 15%. Patience pays.",
    expect: { classification: ["commentary"], copyable: false },
  },
  {
    name: "actionable",
    kind: "post",
    text: ORIGINAL,
    expect: { classification: ["actionable"], copyable: true, entryPrice: "2400" },
  },
  {
    name: "ambiguous",
    kind: "post",
    text: "Might add some $ETH somewhere in the low 2,300s if support holds. We'll see.",
    expect: { classification: ["ambiguous", "unsupported"], copyable: false },
  },
  {
    name: "revision",
    kind: "reply",
    original: ORIGINAL,
    text: "Update: moving my $ETH entry down to $2,350. Target and invalidation unchanged.",
    expect: { revisionType: "update", entryPrice: "2350" },
  },
  {
    name: "withdrawal",
    kind: "reply",
    original: ORIGINAL,
    text: "Scrap this setup, it's no longer valid. Stepping aside for now.",
    expect: { revisionType: "withdrawal" },
  },
];
