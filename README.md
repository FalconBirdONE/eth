# Setup Terminal

Next.js + TypeScript + Tailwind. `/` introduces the product; `/terminal` provides a browser-local demo feed and trade review. No login, wallet, API credentials, or backend is required.

```sh
npm install
npm run dev
npm run lint
npm run build
```

Open http://localhost:3000/terminal.

## Demo data and order lifecycle

- `lib/terminal-data.ts` contains the three typed feed fixtures, setup versions, demo network, illustrative swap assumptions, and bundled v1 order. The actionable fixture reuses `lib/example-setup.ts` so the homepage and terminal agree.
- `lib/demo-orders.ts` validates and persists visitor-created simulations under `setup-terminal.demo-orders.v1`. It stores a snapshot of price, size, creator entry at review, and setup version. Viewing a different creator version does not mutate saved orders.
- Reset demo removes visitor simulations and retains the bundled reference order. Orders are local to the browser and origin; they do not execute or reserve funds.
- The feed and selected setup are separate panes on desktop. Below 700 px, the feed opens first and a selection opens the detail view. My Orders is a local view.

## Integration boundaries

`TradeProvider` in `lib/trade-provider.ts` separates provider quotes from creator entries and user-selected limits. `TradeReviewRequest` is a discriminated union for swap and limit reviews. `TradeReview` accepts a provider, and its `onSave` callback receives the reviewed terms. The current callback only saves a simulation.

The shipped adapter returns deterministic **illustrative** Uniswap quote amounts. Its environment is `demo`, its network label is Base, and all live execution capabilities are false. No transaction or wallet call is implemented. A network name alone must never enable execution. A connected testnet adapter may supply real Uniswap quotes/swaps only with configured execution and user confirmation; Flash previews on testnet remain simulated. Mainnet Flash signing additionally requires a configured provider and wallet confirmation flow before execution can be enabled. The current UI deliberately disables submission for non-demo providers until that execution flow is connected.

`TradeSetup` supports an optional real source URL and extraction verification metadata. `EvidenceDisclosure` displays request IDs only when supplied. Sample data does not fabricate X links, transaction hashes, or verification IDs.

## Shared UI

The terminal shares the wordmark, tabular price formatting, extraction disclosure, and `components/shared/price-rail.tsx` with the homepage. The homepage CTA points to `/terminal`. Terminal-specific styling lives in `app/terminal/terminal.css`.
