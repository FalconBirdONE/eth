// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {Deployers} from "@uniswap/v4-core/test/utils/Deployers.sol";
import {MockERC20} from "solmate/src/test/utils/mocks/MockERC20.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {PoolSwapTest} from "@uniswap/v4-core/src/test/PoolSwapTest.sol";
import {SwapParams, ModifyLiquidityParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {LiquidityAmounts} from "@uniswap/v4-periphery/src/libraries/LiquidityAmounts.sol";
import {LimitOrderHook, OrderIdLibrary} from "@openzeppelin/uniswap-hooks/src/general/LimitOrderHook.sol";

import {SetupLimitOrderHook} from "../src/SetupLimitOrderHook.sol";

/// Mirrors the demo: currency0 = USDC (6 decimals), currency1 = WETH (18 decimals), so a tick is
/// log_1.0001(1e12 / price), where price is USDC per WETH. Tick 198300 ~ 2,445.52; 198590 ~ 2,375.62.
contract SetupLimitOrderHookTest is Test, Deployers {
    int24 constant SPACING = 10;
    int24 constant START_TICK = 198300;
    int24 constant ORDER_TICK = 198590; // follower's "buy WETH at 2,375 USDC" entry, rounded to spacing

    SetupLimitOrderHook hook;
    MockERC20 usdc;
    MockERC20 weth;
    address follower = makeAddr("follower");
    address mover = makeAddr("mover");

    function setUp() public {
        deployFreshManagerAndRouters();

        weth = new MockERC20("Wrapped Ether", "WETH", 18);
        usdc = new MockERC20("USD Coin", "USDC", 6);
        // Base Sepolia's USDC sorts below WETH; keep the same order here.
        while (address(usdc) > address(weth)) usdc = new MockERC20("USD Coin", "USDC", 6);
        currency0 = Currency.wrap(address(usdc));
        currency1 = Currency.wrap(address(weth));

        hook = SetupLimitOrderHook(address(uint160(Hooks.AFTER_INITIALIZE_FLAG | Hooks.AFTER_SWAP_FLAG)));
        deployCodeTo("SetupLimitOrderHook.sol:SetupLimitOrderHook", abi.encode(address(manager)), address(hook));

        (key,) = initPool(currency0, currency1, IHooks(address(hook)), 500, SPACING, TickMath.getSqrtPriceAtTick(START_TICK));

        // Two-sided pool liquidity from the team wallet (this contract).
        usdc.mint(address(this), 10_000_000e6);
        weth.mint(address(this), 4_000e18);
        usdc.approve(address(modifyLiquidityRouter), type(uint256).max);
        weth.approve(address(modifyLiquidityRouter), type(uint256).max);
        modifyLiquidityRouter.modifyLiquidity(
            key, ModifyLiquidityParams({tickLower: 197000, tickUpper: 199600, liquidityDelta: 1e15, salt: 0}), ZERO_BYTES
        );

        usdc.mint(follower, 1_000e6);
        vm.prank(follower);
        usdc.approve(address(hook), type(uint256).max);

        weth.mint(mover, 1_000e18);
        vm.prank(mover);
        weth.approve(address(swapRouter), type(uint256).max);
    }

    /// Returns the order ID. Capture it at placement: once filled, the hook clears the tick-to-ID mapping,
    /// so getOrderId(key, tick, true) no longer finds it. The app stores it on the Arkiv order record.
    function _placeFollowerOrder(uint256 usdcAmount) internal returns (OrderIdLibrary.OrderId id) {
        uint128 liquidity = LiquidityAmounts.getLiquidityForAmount0(
            TickMath.getSqrtPriceAtTick(ORDER_TICK), TickMath.getSqrtPriceAtTick(ORDER_TICK + SPACING), usdcAmount
        );
        vm.prank(follower);
        hook.placeOrder(key, ORDER_TICK, true, liquidity);
        id = hook.getOrderId(key, ORDER_TICK, true);
    }

    /// A team wallet sells WETH for USDC, raising the tick (lowering the ETH price) past `toTick`.
    function _movePriceTo(int24 toTick) internal {
        vm.prank(mover);
        swapRouter.swap(
            key,
            SwapParams({zeroForOne: false, amountSpecified: -1_000e18, sqrtPriceLimitX96: TickMath.getSqrtPriceAtTick(toTick)}),
            PoolSwapTest.TestSettings({takeClaims: false, settleUsingBurn: false}),
            ZERO_BYTES
        );
    }

    function test_orderTakesFollowerUSDC() public {
        OrderIdLibrary.OrderId id = _placeFollowerOrder(100e6);
        // Rounding inside the pool can leave a few wei of the 100 USDC with the follower.
        assertApproxEqAbs(usdc.balanceOf(follower), 900e6, 2);
        assertGt(hook.getOrderLiquidity(id, follower), 0);
    }

    function test_priceCrossingFillsOrderAndFollowerWithdrawsWETH() public {
        OrderIdLibrary.OrderId id = _placeFollowerOrder(100e6);
        _movePriceTo(ORDER_TICK + 3 * SPACING);

        (bool filled,,,,,) = hook.getOrderInfo(id);
        assertTrue(filled, "order should fill once the price crosses it");

        vm.prank(follower);
        (uint256 amount0, uint256 amount1) = hook.withdraw(id, follower);
        assertEq(amount0, 0, "no USDC left after a full fill");
        // 100 USDC at ~2,375 USDC/WETH is ~0.0421 WETH.
        assertApproxEqRel(amount1, 0.0421e18, 0.01e18);
        assertEq(weth.balanceOf(follower), amount1);
    }

    function test_priceShortOfEntryLeavesOrderOpen() public {
        OrderIdLibrary.OrderId id = _placeFollowerOrder(100e6);
        _movePriceTo(ORDER_TICK - 5 * SPACING);
        (bool filled,,,,,) = hook.getOrderInfo(id);
        assertFalse(filled);
    }

    function test_cancelReturnsUSDC() public {
        _placeFollowerOrder(100e6);
        vm.prank(follower);
        hook.cancelOrder(key, ORDER_TICK, true, follower);
        assertApproxEqAbs(usdc.balanceOf(follower), 1_000e6, 2);
    }

    function test_onlyOwnerLiquidityIsWithdrawable() public {
        OrderIdLibrary.OrderId id = _placeFollowerOrder(100e6);
        _movePriceTo(ORDER_TICK + 3 * SPACING);
        vm.prank(mover);
        vm.expectRevert(LimitOrderHook.ZeroLiquidity.selector); // a stranger has no share of the follower's order
        hook.withdraw(id, mover);
    }
}
