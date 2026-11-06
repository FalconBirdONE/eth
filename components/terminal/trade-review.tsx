"use client";
import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/example-setup";
import { demoConfig, type SetupVersion } from "@/lib/terminal-data";
import {
  demoTradeProvider,
  type SwapQuote,
  type TradeProvider,
  type TradeReviewRequest,
} from "@/lib/trade-provider";
type Mode = "now" | "copy" | "custom";
const actions: { id: Mode; label: string }[] = [
  { id: "now", label: "Buy Now" },
  { id: "copy", label: "Copy Entry" },
  { id: "custom", label: "Customize Entry" },
];
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
  const validSize =
    /^\d+(\.\d{1,2})?$/.test(amount) && size > 0 && size <= 1000000;
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
          if (!ignore)
            setQuoteError(
              "The quote could not be prepared. Change the amount to try again.",
            );
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
    if (mode === "now" && currentQuote)
      onSave({ ...common, type: "swap", quote: currentQuote });
    else if (mode !== "now")
      onSave({ ...common, type: "limit", limitUSDCPerWETH: limit });
  }
  return (
    <aside
      className="trade-review"
      id="trade-review"
      aria-labelledby="review-heading"
    >
      <div className="review-heading">
        <div>
          <span className="t-eyebrow">Your decision</span>
          <h2 id="review-heading">Review trade</h2>
        </div>
        <span className="t-network">
          <i />
          {provider.network.name}
        </span>
      </div>
      <div
        className={`mode-buttons mode-${mode}`}
        role="group"
        aria-label="Trade action"
      >
        {actions.map((action) => (
          <button
            type="button"
            key={action.id}
            aria-pressed={mode === action.id}
            onClick={() => {
              setMode(action.id);
              if (action.id === "custom" && mode !== "custom")
                setCustomLimit(String(version.entryUSD));
            }}
          >
            {action.label}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="review-form" key={mode}>
        <div className="review-path">
          <strong>
            {mode === "now"
              ? "Uniswap swap review"
              : mode === "copy"
                ? "Copy the detected entry"
                : "Choose your limit"}
          </strong>
          <p>
            {mode === "now"
              ? "Review an illustrative USDC → WETH quote."
              : mode === "copy"
                ? "The active setup’s entry is prefilled for your review."
                : "Your limit is independent of the creator’s entry."}
          </p>
        </div>
        {mode !== "now" && (
          <label className="trade-field">
            <span>
              {mode === "copy" ? "Proposed limit" : "Your limit"}
              <small>USDC per WETH</small>
            </span>
            <input
              aria-label={mode === "copy" ? "Proposed limit" : "Your limit"}
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
            />
            <small id="limit-help">
              {mode === "copy"
                ? "Switch to Customize Entry to edit this price."
                : `Creator’s entry: $${formatPrice(version.entryUSD)} USD`}
            </small>
          </label>
        )}
        <label className="trade-field">
          <span>
            Size<small>USDC</small>
          </span>
          <input
            aria-label="Size in USDC"
            type="number"
            inputMode="decimal"
            min="0.01"
            max="1000000"
            step="0.01"
            required
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </label>
        {(!validSize || (mode !== "now" && !validLimit)) && (
          <p className="field-error" role="status">
            Enter a positive size with up to 2 decimals and a limit with up to 6
            decimals. Maximum: 1,000,000.
          </p>
        )}
        {mode === "now" ? (
          <div className="quote-review">
            <span className="t-badge">Illustrative quote</span>
            <dl>
              <div>
                <dt>Expected output</dt>
                <dd>
                  {validSize && currentQuote
                    ? formatPrice(currentQuote.expectedWETH, 10)
                    : "—"}{" "}
                  WETH
                </dd>
              </div>
              <div>
                <dt>Minimum output</dt>
                <dd>
                  {validSize && currentQuote
                    ? formatPrice(currentQuote.minimumWETH, 10)
                    : "—"}{" "}
                  WETH
                </dd>
              </div>
              <div>
                <dt>Slippage assumption</dt>
                <dd>0.5%</dd>
              </div>
              <div>
                <dt>Quote freshness</dt>
                <dd>{currentQuote?.freshness ?? "Preparing example…"}</dd>
              </div>
            </dl>
            <p>
              A fixed example rate of 2,500 USDC per WETH. Gas and fees are not
              estimated.
            </p>
            {quoteError && (
              <p className="field-error" role="alert">
                {quoteError}
              </p>
            )}
          </div>
        ) : (
          <dl className="limit-summary">
            <div>
              <dt>Creator’s entry</dt>
              <dd>${formatPrice(version.entryUSD)} USD</dd>
            </div>
            <div>
              <dt>Your proposed limit</dt>
              <dd>{validLimit ? formatPrice(limit) : "—"} USDC / WETH</dd>
            </div>
            <div>
              <dt>Order source</dt>
              <dd>Setup {version.id}</dd>
            </div>
            <div>
              <dt>Order provider</dt>
              <dd>Definitive Flash · simulated</dd>
            </div>
          </dl>
        )}
        <div className="demo-review-note">
          <span className="blue-dot" />
          <p>Demo mode. No funds move and no wallet signature is requested.</p>
        </div>
        <button
          className="button terminal-primary"
          type="submit"
          disabled={!canSimulate}
        >
          {mode === "now" ? "Simulate swap" : "Simulate limit order"}
          <span aria-hidden="true">↗</span>
        </button>
        <p className="review-fineprint">
          {provider.environment === "demo"
            ? "Saved only in this browser. You can reset your simulations."
            : "Connected execution requires a configured provider and explicit wallet confirmation."}
        </p>
      </form>
    </aside>
  );
}
