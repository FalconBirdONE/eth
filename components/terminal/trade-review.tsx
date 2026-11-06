"use client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPrice } from "@/lib/example-setup";
import { demoConfig, type SetupVersion } from "@/lib/terminal-data";
import {
  demoTradeProvider,
  type SwapQuote,
  type TradeProvider,
  type TradeReviewRequest,
} from "@/lib/trade-provider";
import { Eyebrow, label, Row, segment } from "./panel";

export type Mode = "now" | "copy" | "custom";
const actions: { id: Mode; label: string }[] = [
  { id: "now", label: "Buy now" },
  { id: "copy", label: "Copy" },
  { id: "custom", label: "Custom" },
];

export function TradeReview({
  version,
  setupId,
  mode,
  onModeChange,
  onSave,
  provider = demoTradeProvider,
}: {
  version: SetupVersion;
  setupId: string;
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  onSave: (review: TradeReviewRequest) => void;
  provider?: TradeProvider;
}) {
  const [amount, setAmount] = useState<string>(String(demoConfig.initialSize));
  const [customLimit, setCustomLimit] = useState(String(version.entryUSD));
  const [prevMode, setPrevMode] = useState(mode);
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [quoteError, setQuoteError] = useState("");
  // Entering Customize starts from the creator's entry, as before.
  if (mode !== prevMode) {
    if (mode === "custom") setCustomLimit(String(version.entryUSD));
    setPrevMode(mode);
  }
  const size = Number(amount),
    limit = mode === "copy" ? version.entryUSD : Number(customLimit);
  const validSize = /^\d+(\.\d{1,2})?$/.test(amount) && size > 0 && size <= 1000000;
  const validLimit =
    Number.isFinite(limit) &&
    limit > 0 &&
    limit <= 1000000 &&
    (mode === "copy" || /^\d+(\.\d{1,6})?$/.test(customLimit));
  useEffect(() => {
    let ignore = false;
    if (mode === "now" && validSize) {
      provider
        .getSwapQuote(size)
        .then((next) => {
          if (!ignore) {
            setQuote(next);
            setQuoteError("");
          }
        })
        .catch(() => {
          if (!ignore) setQuoteError("The quote could not be prepared. Change the amount to try again.");
        });
    }
    return () => {
      ignore = true;
    };
  }, [mode, size, validSize, provider]);
  const currentQuote = quote?.amountUSDC === size ? quote : null;
  const canSimulate =
    provider.environment === "demo" &&
    validSize &&
    (mode === "now" ? !!currentQuote && !quoteError : validLimit);
  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSimulate) return;
    const common = {
      setupId,
      setupVersion: version.id,
      creatorEntryUSD: version.entryUSD,
      sizeUSDC: size,
      network: provider.network.name,
    };
    if (mode === "now" && currentQuote) onSave({ ...common, type: "swap", quote: currentQuote });
    else if (mode !== "now") onSave({ ...common, type: "limit", limitUSDCPerWETH: limit });
  }
  const invalid = !validSize || (mode !== "now" && !validLimit);
  const field = "h-10 rounded-[3px] bg-card font-mono text-[15px] font-semibold tabular-nums shadow-none";
  return (
    <section id="trade-review" className="scroll-mt-24" aria-labelledby="review-heading">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Eyebrow>Your decision</Eyebrow>
          <h2 id="review-heading" className="mt-1 font-sans text-lg font-semibold">
            Review trade
          </h2>
        </div>
        <span className={cn(label, "flex items-center gap-1.5 pt-0.5")}>
          <i className="size-[7px] rounded-full bg-[#0052ff]" />
          {provider.network.name}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 overflow-hidden rounded-[3px] border" role="group" aria-label="Trade action">
        {actions.map((action, i) => (
          <button
            key={action.id}
            type="button"
            aria-pressed={mode === action.id}
            onClick={() => onModeChange(action.id)}
            className={cn(segment, "py-2", i > 0 && "border-l")}
          >
            {action.label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="animate-in fade-in mt-4 grid gap-4 duration-300" key={mode}>
        <p className="text-[11px] leading-relaxed text-subtle">
          <strong className="block text-[13px] font-semibold text-foreground">
            {mode === "now" ? "Uniswap swap review" : mode === "copy" ? "Copy the detected entry" : "Choose your limit"}
          </strong>
          {mode === "now"
            ? "Review an illustrative USDC → WETH quote."
            : mode === "copy"
              ? "The active setup’s entry is prefilled for your review."
              : "Your limit is independent of the creator’s entry."}
        </p>

        {mode !== "now" && (
          <div className="grid gap-1.5">
            <Label htmlFor="limit-input" className={cn(label, "flex justify-between")}>
              {mode === "copy" ? "Proposed limit" : "Your limit"}
              <span>USDC / WETH</span>
            </Label>
            <Input
              id="limit-input"
              type="number"
              inputMode="decimal"
              min="0.000001"
              max="1000000"
              step="0.000001"
              required
              value={mode === "copy" ? version.entryUSD : customLimit}
              readOnly={mode === "copy"}
              onChange={(event) => setCustomLimit(event.target.value)}
              aria-describedby="limit-help"
              className={cn(field, "read-only:bg-muted read-only:text-muted-foreground")}
            />
            <small id="limit-help" className="text-[10px] text-subtle">
              {mode === "copy"
                ? "Switch to Customize Entry to edit this price."
                : `Creator’s entry: $${formatPrice(version.entryUSD)} USD`}
            </small>
          </div>
        )}

        <div className="grid gap-1.5">
          <Label htmlFor="size-input" className={cn(label, "flex justify-between")}>
            Size <span>USDC</span>
          </Label>
          <Input
            id="size-input"
            aria-label="Size in USDC"
            type="number"
            inputMode="decimal"
            min="0.01"
            max="1000000"
            step="0.01"
            required
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            aria-invalid={!validSize || undefined}
            className={field}
          />
        </div>

        {invalid && (
          <p className="animate-in fade-in rounded-[3px] border border-destructive/30 bg-destructive/5 px-3 py-2 text-[11px] text-destructive" role="status">
            Enter a positive size with up to 2 decimals and a limit with up to 6 decimals. Maximum: 1,000,000.
          </p>
        )}

        <div className="rounded-[3px] border bg-muted/60 px-3 py-1">
          {mode === "now" ? (
            <>
              <Row name="Expected">{validSize && currentQuote ? formatPrice(currentQuote.expectedWETH, 10) : "—"} WETH</Row>
              <Row name="Minimum">{validSize && currentQuote ? formatPrice(currentQuote.minimumWETH, 10) : "—"} WETH</Row>
              <Row name="Slippage">0.5%</Row>
              <Row name="Freshness">{currentQuote?.freshness ?? "Preparing example…"}</Row>
            </>
          ) : (
            <>
              <Row name="Creator entry">${formatPrice(version.entryUSD)} USD</Row>
              <Row name="Your limit">{validLimit ? formatPrice(limit) : "—"} USDC / WETH</Row>
              <Row name="Order source">Setup {version.id}</Row>
              <Row name="Provider">Definitive Flash · sim</Row>
            </>
          )}
        </div>
        {mode === "now" && (
          <p className="-mt-2 text-[10px] leading-relaxed text-subtle">
            Illustrative quote. A fixed example rate of 2,500 USDC per WETH. Gas and fees are not estimated.
          </p>
        )}
        {quoteError && (
          <p className="rounded-[3px] bg-destructive/5 px-3 py-2 text-[11px] text-destructive" role="alert">
            {quoteError}
          </p>
        )}

        <Button
          className="h-10 rounded-[3px] text-[11px] tracking-[0.08em] uppercase"
          type="submit"
          disabled={!canSimulate}
        >
          {mode === "now" ? "Simulate swap" : "Simulate limit order"} ↗
        </Button>
        <p className="text-center text-[10px] leading-relaxed text-subtle">
          Demo mode. No funds move and no wallet signature is requested.{" "}
          {provider.environment === "demo"
            ? "Saved only in this browser. You can reset your simulations."
            : "Connected execution requires a configured provider and explicit wallet confirmation."}
        </p>
      </form>
    </section>
  );
}
