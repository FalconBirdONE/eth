"use client";
import { exampleSetup as setup, formatPrice } from "@/lib/example-setup";
import { ArrowIcon } from "./icons";

export function RevisionComparison({
  updated,
  onToggle,
}: {
  updated: boolean;
  onToggle: () => void;
}) {
  return (
    <section
      className={`revision ${updated ? "is-updated" : ""}`}
      aria-labelledby="revision-heading"
    >
      <div className="revision-top">
        <div>
          <span className="section-kicker">Illustrative example</span>
          <h2 id="revision-heading">An updated idea. Your original order.</h2>
        </div>
        <button
          className="button update-button"
          type="button"
          onClick={onToggle}
          aria-pressed={updated}
          aria-controls="creator-reply revision-caption"
        >
          {updated ? "Reset example" : "Show creator update"}
          <ArrowIcon />
        </button>
      </div>
      <div
        className="reply-slot"
        id="creator-reply"
        aria-live="polite"
        aria-atomic="true"
      >
        {updated ? (
          <div className="creator-reply" key="reply">
            <span className="reply-arrow" aria-hidden="true">
              ↳
            </span>
            <div>
              <span>{setup.creator} replied</span>
              <p>“{setup.creatorReply}”</p>
            </div>
          </div>
        ) : (
          <p className="reply-prompt">
            What if the creator changes their entry?
            <span>Try the update to compare.</span>
          </p>
        )}
      </div>
      <div
        className="price-rail"
        role="img"
        aria-label={`Illustration: creator entry ${updated ? setup.revisedEntry : setup.originalEntry} dollars. Follower example limit order stays at ${setup.followerPrice} USDC per WETH. Not a live price chart or currency conversion.`}
      >
        <div className="rail-axis" />
        <div className="rail-ticks">
          {Array.from({ length: 41 }, (_, i) => (
            <span key={i} className={i % 5 === 0 ? "major-tick" : ""} />
          ))}
        </div>
        <div className="rail-values">
          {[
            setup.revisedEntry - 50,
            setup.revisedEntry,
            setup.originalEntry,
            setup.originalEntry + 50,
          ].map((price) => (
            <span key={price}>${formatPrice(price)}</span>
          ))}
        </div>
        <div className="creator-marker">
          <div className="marker-label">
            <span>Creator’s entry</span>
            <strong>
              ${formatPrice(updated ? setup.revisedEntry : setup.originalEntry)}
            </strong>
          </div>
          <span className="marker-stem" />
          <span className="marker-node" />
        </div>
        <div
          className={`old-marker ${updated ? "visible" : ""}`}
          aria-hidden="true"
        >
          <span>${formatPrice(setup.originalEntry)}</span>
          <i />
        </div>
        <div className="follower-marker">
          <span className="marker-node" />
          <span className="marker-stem" />
          <div className="marker-label">
            <span>
              Your signed order <b>{setup.status}</b>
            </span>
            <strong>
              {formatPrice(setup.followerPrice)}{" "}
              <small>
                {setup.quoteAsset} / {setup.orderAsset}
              </small>
            </strong>
          </div>
        </div>
      </div>
      <div className="revision-bottom">
        <div
          className="comparison-copy"
          id="revision-caption"
          aria-live="polite"
          aria-atomic="true"
        >
          <span className="lock-symbol" aria-hidden="true">
            <svg
              width="15"
              height="18"
              viewBox="0 0 20 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="3" y="10" width="14" height="11" rx="2" />
              <path d="M6 10V7a4 4 0 0 1 8 0v3m-4 4v3" />
            </svg>
          </span>
          <div className="caption-copy">
            {[false, true].map((revised) => (
              <div
                key={String(revised)}
                className={`caption-state ${updated === revised ? "is-active" : ""}`}
                aria-hidden={updated !== revised}
              >
                <strong>
                  {revised
                    ? "The creator changed their entry. Your example order kept its price."
                    : "Your signed order belongs to you."}
                </strong>
                <p>
                  {revised ? (
                    <>
                      Creator’s entry moved from{" "}
                      <b>${formatPrice(setup.originalEntry)}</b> to{" "}
                      <b>${formatPrice(setup.revisedEntry)}</b>.{" "}
                    </>
                  ) : (
                    <>
                      The creator can revise their idea. Your signed terms stay
                      yours.{" "}
                    </>
                  )}
                  Your example limit order stays open at{" "}
                  <b>
                    {formatPrice(setup.followerPrice)} {setup.quoteAsset} per{" "}
                    {setup.orderAsset}
                  </b>
                  .
                </p>
              </div>
            ))}
          </div>
        </div>
        <p className="rail-note">
          Illustrative entry levels. Not a live chart or currency conversion.
        </p>
      </div>
    </section>
  );
}
