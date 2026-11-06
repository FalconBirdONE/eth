import { exampleSetup } from "./example-setup";

export type SetupVersion = {
  id: "v1" | "v2";
  entryUSD: number;
  excerpt: string;
  timestamp: string;
};
type SetupBase = {
  id: string;
  title: string;
  creator: string;
  asset: "ETH";
  source: string;
  timestamp: string;
  sourceUrl?: string;
  extraction?: { requestId?: string; verificationStatus: string };
};
export type TradeSetup = SetupBase &
  (
    | {
        kind: "actionable";
        status: "Updated";
        targetUSD: number;
        targetExcerpt: string;
        reply: string;
        versions: readonly SetupVersion[];
      }
    | {
        kind: "commentary";
        status: "No explicit entry";
        targetUSD: number;
        targetExcerpt: string;
      }
    | { kind: "ambiguous"; status: "Ambiguous entry"; evidence: string }
  );
export const terminalSetups: readonly TradeSetup[] = [
  {
    id: "eth-buy",
    title: "ETH buy setup",
    creator: exampleSetup.creator,
    asset: "ETH",
    source: exampleSetup.originalPost,
    timestamp: "12 min ago · example",
    kind: "actionable",
    status: "Updated",
    targetUSD: exampleSetup.target,
    targetExcerpt: "First target $2,650",
    reply: exampleSetup.creatorReply,
    versions: [
      {
        id: "v1",
        entryUSD: exampleSetup.originalEntry,
        excerpt: exampleSetup.supportingText,
        timestamp: "18 min ago · example",
      },
      {
        id: "v2",
        entryUSD: exampleSetup.revisedEntry,
        excerpt: "Moving my entry to $2,350",
        timestamp: "12 min ago · example",
      },
    ],
  },
  {
    id: "eth-commentary",
    title: "ETH commentary",
    creator: "Demo creator",
    asset: "ETH",
    source: "ETH to $2,650.",
    timestamp: "35 min ago · example",
    kind: "commentary",
    status: "No explicit entry",
    targetUSD: 2650,
    targetExcerpt: "ETH to $2,650",
  },
  {
    id: "eth-unclear",
    title: "ETH entry unclear",
    creator: "Demo creator",
    asset: "ETH",
    source: "Maybe I buy at $2,400. Might wait for $2,300 instead.",
    timestamp: "1 hr ago · example",
    kind: "ambiguous",
    status: "Ambiguous entry",
    evidence: "Maybe I buy at $2,400. Might wait for $2,300 instead.",
  },
];
export const demoConfig = {
  network: "Base",
  chainId: 8453,
  swapReferencePrice: 2500,
  slippage: 0.005,
  initialSize: exampleSetup.size,
} as const;
export const bundledOrder = {
  id: "bundled-v1-order",
  type: "limit",
  setupId: "eth-buy",
  setupVersion: "v1",
  creatorEntryUSD: exampleSetup.originalEntry,
  limitUSDCPerWETH: exampleSetup.followerPrice,
  sizeUSDC: exampleSetup.size,
  status: "Open",
  simulated: true,
  network: demoConfig.network,
  createdAt: "Bundled example",
  origin: "bundled",
} as const;
