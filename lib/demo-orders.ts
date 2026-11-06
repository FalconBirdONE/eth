"use client";
import { useMemo, useSyncExternalStore } from "react";
import { bundledOrder } from "./terminal-data";
import type { TradeReviewRequest } from "./trade-provider";
export type DemoOrder = {
  id: string;
  type: "limit" | "swap";
  setupId: string;
  setupVersion: "v1" | "v2";
  creatorEntryUSD: number;
  limitUSDCPerWETH?: number;
  expectedWETH?: number;
  minimumWETH?: number;
  sizeUSDC: number;
  status: "Open" | "Swap simulated";
  simulated: true;
  network: string;
  createdAt: string;
  origin: "visitor" | "bundled";
};
const STORAGE_KEY = "setup-terminal.demo-orders.v1";
const CHANGE_EVENT = "setup-terminal:orders-changed";
const positive = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;
function readOrders(raw: string): DemoOrder[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is DemoOrder =>
        !!item &&
        typeof item === "object" &&
        typeof item.id === "string" &&
        item.origin === "visitor" &&
        item.simulated === true &&
        item.setupId === "eth-buy" &&
        ["v1", "v2"].includes(item.setupVersion) &&
        positive(item.creatorEntryUSD) &&
        positive(item.sizeUSDC) &&
        typeof item.createdAt === "string" &&
        item.network === "Base" &&
        ((item.type === "limit" &&
          item.status === "Open" &&
          positive(item.limitUSDCPerWETH)) ||
          (item.type === "swap" &&
            item.status === "Swap simulated" &&
            positive(item.expectedWETH) &&
            positive(item.minimumWETH))),
    );
  } catch {
    return [];
  }
}
function getSnapshot() {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}
function persist(orders: DemoOrder[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
export function useDemoOrders() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => "[]");
  const createdOrders = useMemo(() => readOrders(raw), [raw]);
  return {
    orders: [...createdOrders, bundledOrder] as readonly DemoOrder[],
    createdCount: createdOrders.length,
    save(request: TradeReviewRequest) {
      // Copy review values into an immutable snapshot; no references to the active creator version.
      const order: DemoOrder = {
        id: crypto.randomUUID(),
        type: request.type,
        setupId: request.setupId,
        setupVersion: request.setupVersion,
        creatorEntryUSD: request.creatorEntryUSD,
        sizeUSDC: request.sizeUSDC,
        network: request.network,
        simulated: true,
        origin: "visitor",
        createdAt: new Date().toISOString(),
        status: request.type === "limit" ? "Open" : "Swap simulated",
        ...(request.type === "limit"
          ? { limitUSDCPerWETH: request.limitUSDCPerWETH }
          : {
              expectedWETH: request.quote.expectedWETH,
              minimumWETH: request.quote.minimumWETH,
            }),
      };
      persist([order, ...readOrders(getSnapshot())]);
      return order;
    },
    reset() {
      localStorage.removeItem(STORAGE_KEY);
      window.dispatchEvent(new Event(CHANGE_EVENT));
    },
  };
}
