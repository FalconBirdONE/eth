import { demoConfig, type SetupVersion } from "./terminal-data";
export type SwapQuote = {
  kind: "illustrative" | "live";
  amountUSDC: number;
  expectedWETH: number;
  minimumWETH: number;
  network: string;
  provider: "Uniswap";
  freshness: string;
  expiresAt?: number;
};
export type LimitReview = {
  type: "limit";
  setupId: string;
  setupVersion: SetupVersion["id"];
  creatorEntryUSD: number;
  limitUSDCPerWETH: number;
  sizeUSDC: number;
  network: string;
};
export type SwapReview = {
  type: "swap";
  setupId: string;
  setupVersion: SetupVersion["id"];
  creatorEntryUSD: number;
  sizeUSDC: number;
  quote: SwapQuote;
  network: string;
};
export type TradeReviewRequest = LimitReview | SwapReview;
/** A connected provider supplies live quotes and capabilities. This UI never infers signing permission from a network name. */
export interface TradeProvider {
  environment: "demo" | "testnet" | "mainnet";
  network: { name: string; chainId: number };
  capabilities: {
    liveQuotes: boolean;
    realSwaps: boolean;
    flashSigning: boolean;
  };
  getSwapQuote(amountUSDC: number): Promise<SwapQuote>;
}
export const demoTradeProvider: TradeProvider = {
  environment: "demo",
  network: { name: demoConfig.network, chainId: demoConfig.chainId },
  capabilities: { liveQuotes: false, realSwaps: false, flashSigning: false },
  async getSwapQuote(amountUSDC) {
    if (!Number.isFinite(amountUSDC) || amountUSDC <= 0)
      throw new Error("Enter a positive USDC amount.");
    const expectedWETH = amountUSDC / demoConfig.swapReferencePrice;
    return {
      kind: "illustrative",
      amountUSDC,
      expectedWETH,
      minimumWETH: expectedWETH * (1 - demoConfig.slippage),
      network: demoConfig.network,
      provider: "Uniswap",
      freshness: "Static example · not a live quote",
    };
  },
};
