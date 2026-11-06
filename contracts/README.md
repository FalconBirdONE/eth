# Contracts: Uniswap v4 limit orders

## Why this exists (track change)

The original plan used **Definitive Flash** for Copy Entry and Customize Entry limit orders. Flash only runs on mainnets (no testnet or sandbox), and its prize requires on-chain execution in the demo, which means spending real money. The team decided not to.

New track set: **0G + Uniswap + Arkiv**. Definitive is dropped.

| Part of the product | Before | Now |
|---|---|---|
| Read X posts, extract entries, detect revisions | 0G | 0G (unchanged) |
| Buy Now (market buy) | Uniswap, Base mainnet | Uniswap, **Base Sepolia** |
| Copy / Customize Entry (limit buy) | Definitive Flash, Base mainnet | **This hook**: Uniswap v4 limit orders on Base Sepolia |
| Setups, versions, follower order records | Supabase | **Arkiv** testnet (follower-owned order records) |

Everything runs on testnets, funded from free faucets. Flash was only the venue that executed limit orders. The copy-trading idea is unchanged.

## What's here

- `src/SetupLimitOrderHook.sol`: OpenZeppelin's `LimitOrderHook` (uniswap-hooks v1.2.1) for our USDC/WETH pool.
  - The follower deposits USDC at the tick for their price. The deposit converts to WETH when the pool price crosses that tick, and the follower then calls `withdraw`.
- `test/SetupLimitOrderHook.t.sol`: tests for placing, filling, an unfilled order, cancelling, and a stranger who can't withdraw.
- `script/00_DeployHook.s.sol`: deploys the hook at a mined address. It needs the afterInitialize and afterSwap flags.
- `script/01_CreatePoolAndAddLiquidity.s.sol`: creates the USDC/WETH pool (fee 0.05%, tick spacing 10, about 2,445.52 USDC per WETH) and seeds it with 18 USDC and 0.0075 WETH.
- `script/02_MovePrice.s.sol`: demo only. It sells WETH up to `TARGET_TICK` so follower orders fill. The team sets the pool price; it does not track the market.

Price to tick: `tick = log_1.0001(1e12 / price)`, where price is in USDC per WETH. A higher tick means a cheaper ETH. Tick 198590 is about 2,375.62.

**The app must save the order ID when it places an order.** Once an order fills, the hook clears the mapping from price to order ID.

## Run

```
git submodule update --init --recursive
cd contracts
forge test

cast wallet import deployer --interactive
forge script script/00_DeployHook.s.sol --rpc-url https://sepolia.base.org --account deployer --broadcast
HOOK_ADDRESS=<printed> forge script script/01_CreatePoolAndAddLiquidity.s.sol --rpc-url https://sepolia.base.org --account deployer --broadcast
HOOK_ADDRESS=<printed> TARGET_TICK=198620 forge script script/02_MovePrice.s.sol --rpc-url https://sepolia.base.org --account deployer --broadcast
```

The deployer needs Base Sepolia ETH for gas, test USDC from faucet.circle.com, and WETH (wrap ETH with `deposit()` on `0x4200000000000000000000000000000000000006`).

Status: tested locally and on a local fork of Base Sepolia. Not yet deployed to Base Sepolia. Not audited; for testnet demo use only.
