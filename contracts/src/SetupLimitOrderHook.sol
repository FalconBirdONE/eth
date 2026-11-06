// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {BaseHook} from "@openzeppelin/uniswap-hooks/src/base/BaseHook.sol";
import {LimitOrderHook} from "@openzeppelin/uniswap-hooks/src/general/LimitOrderHook.sol";

/// @notice Limit orders for Setup Terminal's USDC/WETH pool. Followers "Copy Entry" by placing
/// out-of-range USDC liquidity at the tick for their USDC-per-WETH price; it converts to WETH when
/// the pool price crosses it. All order logic is OpenZeppelin's LimitOrderHook (uniswap-hooks v1.2.1).
contract SetupLimitOrderHook is LimitOrderHook {
    constructor(IPoolManager poolManager) BaseHook(poolManager) {}
}
