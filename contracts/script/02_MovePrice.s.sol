// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {console} from "forge-std/console.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {StateLibrary} from "@uniswap/v4-core/src/libraries/StateLibrary.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolSwapTest} from "@uniswap/v4-core/src/test/PoolSwapTest.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";

import {BaseScript} from "./base/BaseScript.sol";

/// @notice Demo-only price move: a team wallet sells WETH for USDC until the pool reaches TARGET_TICK,
/// which fills any follower limit orders the price crosses. Higher tick = lower USDC-per-WETH price
/// (tick 198590 ~ 2,375.62). The swap spends at most MAX_WETH and stops at the target tick.
contract MovePriceScript is BaseScript {
    using StateLibrary for IPoolManager;

    // Uniswap's PoolSwapTest on Base Sepolia (its manager() is the v4 PoolManager); it accepts a price limit.
    PoolSwapTest constant SWAP_TEST = PoolSwapTest(0x8B5bcC363ddE2614281aD875bad385E0A785D3B9);

    function run() external {
        int24 targetTick = int24(vm.envInt("TARGET_TICK"));
        uint256 maxWeth = vm.envOr("MAX_WETH", uint256(0.005e18));

        PoolKey memory key = PoolKey({
            currency0: currency0, currency1: currency1, fee: LP_FEE, tickSpacing: TICK_SPACING, hooks: hookContract
        });
        (, int24 tickBefore,,) = poolManager.getSlot0(key.toId());
        require(targetTick > tickBefore, "MovePrice: target must be above the current tick (a lower ETH price)");

        vm.startBroadcast();
        token1.approve(address(SWAP_TEST), maxWeth);
        SWAP_TEST.swap(
            key,
            SwapParams({
                zeroForOne: false, // WETH in, USDC out: the tick rises
                amountSpecified: -int256(maxWeth),
                sqrtPriceLimitX96: TickMath.getSqrtPriceAtTick(targetTick)
            }),
            PoolSwapTest.TestSettings({takeClaims: false, settleUsingBurn: false}),
            new bytes(0)
        );
        vm.stopBroadcast();

        (, int24 tickAfter,,) = poolManager.getSlot0(key.toId());
        console.log("tick before %s", vm.toString(tickBefore));
        console.log("tick after  %s", vm.toString(tickAfter));
    }
}
