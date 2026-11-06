"use client";
import { useEffect, useState } from "react";
import { ArrowUpRight, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPrice } from "@/lib/example-setup";
import { demoConfig, type SetupVersion } from "@/lib/terminal-data";
import {
  demoTradeProvider,
  type SwapQuote,
  type TradeProvider,
  type TradeReviewRequest,
} from "@/lib/trade-provider";
import { Eyebrow, panel } from "./panel";

type Mode = "now" | "copy" | "custom";
const actions: { id: Mode; label: string }[] = [
  { id: "now", label: "Buy Now" },
  { id: "copy", label: "Copy Entry" },
  { id: "custom", label: "Customize" },
];

function Summary({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="grid gap-2.5 rounded-xl border bg-background/50 p-4 text-sm">
      {rows.map(([dt, dd]) => (
        <div key={dt} className="flex items-baseline justify-between gap-3">
          <dt className="text-xs text-muted-foreground">{dt}</dt>
          <dd className="text-right font-medium tabular-nums">{dd}</dd>
        </div>
      ))}
    </dl>
  );
}

export function TradeReview({
  version,
  setupId,
  onSave,
  provider = demoTradeProvider,
}: {
  version: SetupVersion;
  setupId: string;
  onSave: (review: TradeReviewRequest) => void;
  provider?: TradeProvider;
}) {
  const [mode, setMode] = useState<Mode>("copy");
  const [amount, setAmount] = useState<string>(String(demoConfig.initialSize));
  const [customLimit, setCustomLimit] = useState(String(version.entryUSD));
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [quoteError, setQuoteError] = useState("");
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
  return (
    <aside
      className={cn(
        panel,
        "relative h-fit scroll-mt-28 overflow-hidden p-5 shadow-[0_20px_60px_-30px_oklch(0.9_0.19_125/40%)] sm:p-6 xl:sticky xl:top-28",
      )}
      id="trade-review"
      aria-labelledby="review-heading"
    >
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <Eyebrow>Your decision</Eyebrow>
          <h2 id="review-heading" className="mt-1 text-xl font-semibold">
            Review trade
          </h2>
        </div>
        <Badge variant="outline" className="gap-1.5">
          <i className="size-2 rounded-full bg-[#0052ff]" />
          {provider.network.name}
        </Badge>
      </div>

      <Tabs
        value={mode}
        onValueChange={(value) => {
          if (value === "custom" && mode !== "custom") setCustomLimit(String(version.entryUSD));
          setMode(value as Mode);
        }}
        className="mt-5"
      >
        <TabsList aria-label="Trade action" className="h-9! w-full">
          {actions.map((action) => (
            <TabsTrigger key={action.id} value={action.id} className="text-xs data-[state=active]:text-primary">
              {action.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <form
        onSubmit={submit}
        className="animate-in fade-in slide-in-from-bottom-2 mt-5 grid gap-4 duration-300"
        key={mode}
      >
        <div>
          <strong className="text-sm font-medium">
            {mode === "now"
              ? "Uniswap swap review"
              : mode === "copy"
                ? "Copy the detected entry"
                : "Choose your limit"}
          </strong>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {mode === "now"
              ? "Review an illustrative USDC → WETH quote."
              : mode === "copy"
                ? "The active setup’s entry is prefilled for your review."
                : "Your limit is independent of the creator’s entry."}
          </p>
        </div>

        {mode !== "now" && (
          <div className="grid gap-1.5">
            <Label htmlFor="limit-input" className="flex justify-between text-xs">
              {mode === "copy" ? "Proposed limit" : "Your limit"}
              <span className="font-normal text-muted-foreground">USDC per WETH</span>
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
              className="h-11 text-lg font-medium tabular-nums read-only:text-muted-foreground"
            />
            <small id="limit-help" className="text-[11px] text-muted-foreground">
              {mode === "copy"
                ? "Switch to Customize Entry to edit this price."
                : `Creator’s entry: $${formatPrice(version.entryUSD)} USD`}
            </small>
          </div>
        )}

        <div className="grid gap-1.5">
          <Label htmlFor="size-input" className="flex justify-between text-xs">
            Size <span className="font-normal text-muted-foreground">USDC</span>
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
            className="h-11 text-lg font-medium tabular-nums"
          />
        </div>

        {invalid && (
          <p className="animate-in fade-in rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive" role="status">
            Enter a positive size with up to 2 decimals and a limit with up to 6 decimals. Maximum: 1,000,000.
          </p>
        )}

        {mode === "now" ? (
          <div className="grid gap-3">
            <Badge variant="secondary" className="w-fit">
              Illustrative quote
            </Badge>
            <Summary
              rows={[
                ["Expected output", `${validSize && currentQuote ? formatPrice(currentQuote.expectedWETH, 10) : "—"} WETH`],
                ["Minimum output", `${validSize && currentQuote ? formatPrice(currentQuote.minimumWETH, 10) : "—"} WETH`],
                ["Slippage assumption", "0.5%"],
                ["Quote freshness", currentQuote?.freshness ?? "Preparing example…"],
              ]}
            />
            <p className="text-[11px] text-muted-foreground">
              A fixed example rate of 2,500 USDC per WETH. Gas and fees are not estimated.
            </p>
            {quoteError && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">
                {quoteError}
              </p>
            )}
          </div>
        ) : (
          <Summary
            rows={[
              ["Creator’s entry", `$${formatPrice(version.entryUSD)} USD`],
              ["Your proposed limit", `${validLimit ? formatPrice(limit) : "—"} USDC / WETH`],
              ["Order source", `Setup ${version.id}`],
              ["Order provider", "Definitive Flash · simulated"],
            ]}
          />
        )}

        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0 text-primary" />
          <p>Demo mode. No funds move and no wallet signature is requested.</p>
        </div>
        <Button
          size="lg"
          className="h-11 text-sm shadow-[0_0_30px_-10px_var(--primary)]"
          type="submit"
          disabled={!canSimulate}
        >
          {mode === "now" ? "Simulate swap" : "Simulate limit order"}
          <ArrowUpRight aria-hidden="true" />
        </Button>
        <p className="text-center text-[11px] text-muted-foreground">
          {provider.environment === "demo"
            ? "Saved only in this browser. You can reset your simulations."
            : "Connected execution requires a configured provider and explicit wallet confirmation."}
        </p>
      </form>
    </aside>
  );
}
