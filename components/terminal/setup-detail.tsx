"use client";
import type { ReactElement } from "react";
import { formatPrice } from "@/lib/example-setup";
import {
  bundledOrder,
  type TradeSetup,
  type SetupVersion,
} from "@/lib/terminal-data";
import type { TradeReviewRequest } from "@/lib/trade-provider";
import { EthereumMark, ArrowIcon } from "../home/icons";
import { EvidenceDisclosure } from "../home/evidence-disclosure";
import { PriceRail } from "../shared/price-rail";
import { TradeReview } from "./trade-review";
function Highlight({ text, phrases }: { text: string; phrases: string[] }) {
  let parts: (string | ReactElement)[] = [text];
  for (const phrase of phrases.filter(Boolean))
    parts = parts.flatMap<string | ReactElement>((part, index) =>
      typeof part !== "string"
        ? [part]
        : part
            .split(phrase)
            .flatMap((segment, i) =>
              i
                ? [
                    <mark key={`${phrase}-${index}-${i}`}>{phrase}</mark>,
                    segment,
                  ]
                : [segment],
            ),
    );
  return <>{parts}</>;
}
export function SetupDetail({
  setup,
  versionId,
  onVersionChange,
  onSave,
}: {
  setup: TradeSetup;
  versionId: "v1" | "v2";
  onVersionChange: (id: "v1" | "v2") => void;
  onSave: (request: TradeReviewRequest) => void;
}) {
  const version =
    setup.kind === "actionable"
      ? (setup.versions.find((v) => v.id === versionId) ?? setup.versions[1])
      : null;
  const updated = version?.id === "v2";
  const evidence =
    setup.kind === "actionable"
      ? [
          {
            label: "Original entry · Setup v1",
            text: setup.versions[0].excerpt,
          },
          {
            label: "Updated entry · Setup v2",
            text: setup.versions[1].excerpt,
          },
          { label: "Reference target", text: setup.targetExcerpt },
        ]
      : setup.kind === "commentary"
        ? [
            {
              label: "Price mention without an entry instruction",
              text: setup.source,
            },
          ]
        : [
            {
              label: "Two conditional levels; neither is confirmed",
              text: setup.evidence,
            },
          ];
  return (
    <div className="setup-detail" key={setup.id}>
      <div className="detail-top">
        <div>
          <span className="t-eyebrow">Selected setup</span>
          <h1 id="selected-setup-title" tabIndex={-1}>
            {setup.title}
          </h1>
          <p>
            {setup.creator}
            <span>From X · {setup.timestamp}</span>
          </p>
        </div>
        <span
          className={`t-badge ${setup.kind === "actionable" ? "badge-blue" : "badge-neutral"}`}
        >
          {setup.status}
        </span>
      </div>
      <div className="detail-body">
        <div className="detail-main">
          <section className="setup-summary" aria-label="Setup terms">
            <span className="detail-asset">
              <EthereumMark />
              <strong>ETH</strong>
              {setup.kind === "actionable" && <span>Buy</span>}
            </span>
            <div>
              <span>{version ? "Creator’s entry" : "Detected entry"}</span>
              <strong className={!version ? "unconfirmed-value" : undefined}>
                {version
                  ? `$${formatPrice(version.entryUSD)}`
                  : "Not confirmed"}
              </strong>
              {version ? (
                <small>
                  {updated
                    ? `Previous: $${formatPrice(setup.kind === "actionable" ? setup.versions[0].entryUSD : version.entryUSD)} USD`
                    : "Original entry · Setup v1"}
                </small>
              ) : (
                <small>{setup.status}</small>
              )}
            </div>
            <div>
              <span>
                {setup.kind === "commentary"
                  ? "Mentioned level"
                  : "Reference target"}
              </span>
              <strong>
                {setup.kind !== "ambiguous"
                  ? `$${formatPrice(setup.targetUSD)}`
                  : "—"}
              </strong>
              <small>
                {setup.kind === "ambiguous"
                  ? "No confirmed target"
                  : setup.kind === "commentary"
                    ? "USD · not an entry"
                    : "USD · reference only"}
              </small>
            </div>
          </section>
          {version && (
            <a className="detail-trade-jump" href="#trade-review">
              Choose how to enter
              <ArrowIcon />
            </a>
          )}
          <section className="source-surface" aria-label="Source post">
            <div className="source-surface-heading">
              <div className="creator">
                <span className="avatar">D</span>
                <div>
                  <strong>{setup.creator}</strong>
                  <span>Original X post · sample</span>
                </div>
              </div>
              <span className="x-mark" aria-label="X">
                𝕏
              </span>
            </div>
            <blockquote>
              “
              <Highlight
                text={setup.source}
                phrases={
                  setup.kind === "actionable"
                    ? [setup.versions[0].excerpt, setup.targetExcerpt]
                    : setup.kind === "commentary"
                      ? [setup.targetExcerpt]
                      : []
                }
              />
              ”
            </blockquote>
            {setup.kind === "actionable" && (
              <div className="source-reply">
                <span aria-hidden="true">↳</span>
                <div>
                  <span>Creator’s reply · Setup v2</span>
                  <p>
                    “
                    <Highlight
                      text={setup.reply}
                      phrases={[setup.versions[1].excerpt]}
                    />
                    ”
                  </p>
                </div>
              </div>
            )}
            {setup.sourceUrl && (
              <a href={setup.sourceUrl} target="_blank" rel="noreferrer">
                View source on X
              </a>
            )}
            <EvidenceDisclosure
              label="View extraction"
              entries={evidence}
              note="Example extraction. Source text is bundled sample data."
              verification={{
                status:
                  setup.extraction?.verificationStatus ??
                  "Example extraction · not independently verified",
                requestId: setup.extraction?.requestId,
              }}
            />
          </section>
          {setup.kind === "actionable" && version ? (
            <CreatorUpdate
              setup={setup}
              version={version}
              updated={updated}
              onVersionChange={onVersionChange}
            />
          ) : (
            <section className="unavailable-setup">
              <span className="unavailable-icon" aria-hidden="true">
                —
              </span>
              <h2>{setup.status}</h2>
              <p>
                {setup.kind === "commentary"
                  ? "A price mention is not an entry instruction. This post does not say where the creator plans to buy."
                  : "The creator mentions two possible prices without committing to either. Neither is treated as a confirmed entry."}
              </p>
              <p>
                You can inspect the source and extraction. Trade actions are
                unavailable for this sample.
              </p>
            </section>
          )}
        </div>
        {setup.kind === "actionable" && version ? (
          <TradeReview setupId={setup.id} version={version} onSave={onSave} />
        ) : (
          <aside className="trade-review unavailable-review">
            <span className="t-eyebrow">Trade review</span>
            <h2>A clear entry comes first.</h2>
            <p>
              {setup.kind === "commentary"
                ? "No entry detected."
                : "Entry needs clarification."}{" "}
              No creator price has been prefilled.
            </p>
            <div
              className="unavailable-actions"
              aria-label="Unavailable trade actions"
            >
              <button disabled>Buy Now</button>
              <button disabled>Copy Entry</button>
              <button disabled>Customize Entry</button>
            </div>
            <p className="review-fineprint">
              Choose the ETH buy setup to explore the demo trade flow.
            </p>
          </aside>
        )}
      </div>
    </div>
  );
}
function CreatorUpdate({
  setup,
  version,
  updated,
  onVersionChange,
}: {
  setup: Extract<TradeSetup, { kind: "actionable" }>;
  version: SetupVersion;
  updated: boolean;
  onVersionChange: (id: "v1" | "v2") => void;
}) {
  return (
    <section
      className="creator-update"
      aria-labelledby="creator-update-heading"
    >
      <div className="update-heading">
        <div>
          <span className="t-eyebrow">Signed terms stay yours</span>
          <h2 id="creator-update-heading">Creator update</h2>
        </div>
        <div className="version-switch" role="group" aria-label="Setup version">
          <button
            type="button"
            aria-pressed={!updated}
            onClick={() => onVersionChange("v1")}
          >
            Original
          </button>
          <button
            type="button"
            aria-pressed={updated}
            onClick={() => onVersionChange("v2")}
          >
            Updated
          </button>
        </div>
      </div>
      <div className="update-entry">
        <span>Creator’s entry</span>
        <strong>
          ${formatPrice(setup.versions[0].entryUSD)}{" "}
          <span aria-hidden="true">→</span> $
          {formatPrice(setup.versions[1].entryUSD)} <small>USD</small>
        </strong>
      </div>
      <div className="rail-label">
        <span>Illustrative</span>
        <span>Viewing Setup {version.id}</span>
      </div>
      <PriceRail updated={updated} explicitUnits />
      <p className="update-statement">
        The creator moved their entry to $2,350. Your example order is still
        open at 2,375 USDC per WETH.
      </p>
      <p className="update-view-note">
        {!updated
          ? "Viewing the original entry on the rail. The current setup is v2."
          : "The rail compares entry levels, not a live price or USD-to-USDC conversion."}
      </p>
      <dl className="signed-order-terms">
        <div>
          <dt>Your example order</dt>
          <dd>{formatPrice(bundledOrder.limitUSDCPerWETH)} USDC per WETH</dd>
        </div>
        <div>
          <dt>Size</dt>
          <dd>{bundledOrder.sizeUSDC} USDC</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>Open · Simulated</dd>
        </div>
        <div>
          <dt>Order source</dt>
          <dd>Setup {bundledOrder.setupVersion}</dd>
        </div>
      </dl>
      <ol className="version-timeline" aria-label="Setup history">
        {setup.versions.map((v) => (
          <li
            key={v.id}
            className={version.id === v.id ? "active-version" : ""}
          >
            <span className="timeline-node" />
            <div>
              <div className="timeline-heading">
                <strong>
                  Setup {v.id} <b>${formatPrice(v.entryUSD)} USD</b>
                </strong>
                <span>
                  {v.id === "v1"
                    ? "Example order source"
                    : "Current creator entry"}
                </span>
              </div>
              <p>“{v.excerpt}”</p>
              <small>{v.timestamp}</small>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
