/** Illustrative local data only. No market quotes, orders, or external requests. */
export const exampleSetup = {
  creator: "Demo creator",
  asset: "ETH",
  direction: "Buy",
  originalPost: "Looking to buy ETH at $2,400 or below. First target $2,650.",
  supportingText: "buy ETH at $2,400 or below",
  originalEntry: 2400,
  target: 2650,
  extractionLabel: "AI-extracted",
  creatorReply: "Moving my entry to $2,350. Same target.",
  revisedEntry: 2350,
  followerPrice: 2375,
  orderAsset: "WETH",
  quoteAsset: "USDC",
  size: 25,
  network: "Base",
  status: "Open",
} as const;

export const formatPrice = (price: number) => price.toLocaleString("en-US");
export const primaryAction = { label: "Explore the example", href: "#example" };
