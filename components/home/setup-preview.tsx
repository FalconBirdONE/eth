"use client";
import { useId } from "react";
import { exampleSetup as setup, formatPrice } from "@/lib/example-setup";
import { EthereumMark } from "./icons";
import { EvidenceDisclosure } from "./evidence-disclosure";
export type EntryMode = "now" | "copy" | "custom";
const modes: { id: EntryMode; label: string }[] = [
  { id: "now", label: "Buy Now" },
  { id: "copy", label: "Copy Entry" },
  { id: "custom", label: "Customize Entry" },
];
export function SetupPreview({
  updated,
  mode,
  onModeChange,
}: {
  updated: boolean;
  mode: EntryMode;
  onModeChange: (mode: EntryMode) => void;
}) {
  const panelId = useId();
  const entry = updated ? setup.revisedEntry : setup.originalEntry;
  const [beforeEntry, afterEntry] = setup.originalPost.split(
    setup.supportingText,
  );
  return (
    <section
      className="setup-preview"
      id="example"
      aria-label="Interactive setup example"
    >
      <div className="preview-heading">
        <span>
          <i className="blue-dot" />
          Interactive example
        </span>
        <span className="preview-index">{setup.asset} / 001</span>
      </div>
      <div className="setup-flow">
        <div className="source-post">
          <div className="source-label">
            Original post{" "}
            <span className="x-mark" aria-label="X">
              𝕏
            </span>
          </div>
          <div className="creator">
            <span className="avatar">D</span>
            <div>
              <strong>{setup.creator}</strong>
              <span>Illustrative X post</span>
            </div>
          </div>
          <blockquote>
            “{beforeEntry}
            <mark>{setup.supportingText}</mark>
            {afterEntry}”
          </blockquote>
          <div className="source-foot">A post. A clear entry.</div>
        </div>
        <div className="extracted-setup">
          <div className="source-label">
            Extracted terms{" "}
            <span className="ai-label">{setup.extractionLabel}</span>
          </div>
          <div className="asset-heading">
            <span className="eth-icon">
              <EthereumMark />
            </span>
            <strong>{setup.asset}</strong>
            <span className="buy-label">{setup.direction}</span>
          </div>
          <dl>
            <div>
              <dt>Creator’s entry</dt>
              <dd key={entry}>
                ${formatPrice(entry)} <small>or below</small>
              </dd>
            </div>
            <div>
              <dt>Reference target</dt>
              <dd>${formatPrice(setup.target)}</dd>
            </div>
          </dl>
        </div>
      </div>
      <div className="entry-controls">
        <div
          className={`mode-buttons mode-${mode}`}
          role="group"
          aria-label="Choose how to enter"
        >
          {modes.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={mode === item.id}
              aria-controls={panelId}
              onClick={() => onModeChange(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div id={panelId} className="mode-panel" aria-live="polite">
          {modes.map(({ id: panelMode }) => (
            <div
              className={`mode-panel-content ${mode === panelMode ? "is-active" : ""}`}
              key={panelMode}
              aria-hidden={mode !== panelMode}
            >
              <div className="mode-description">
                {panelMode === "now" ? (
                  <>
                    <strong>Your size. A fresh quote.</strong>
                    <p>
                      Buy Now requests an immediate Uniswap quote for your size.
                      Review it before you confirm.
                    </p>
                  </>
                ) : panelMode === "copy" ? (
                  <>
                    <strong>The creator’s entry, ready to review.</strong>
                    <p>
                      Copy Entry prefills {formatPrice(entry)}{" "}
                      {setup.quoteAsset} per {setup.orderAsset}. Choose your
                      size and review before signing.
                    </p>
                  </>
                ) : (
                  <>
                    <strong>Your setup. Your entry.</strong>
                    <p>
                      Choose your own limit price. Here, you signed an example
                      order at {formatPrice(setup.followerPrice)}{" "}
                      {setup.quoteAsset} per {setup.orderAsset}.
                    </p>
                  </>
                )}
              </div>
              <div className="order-fields">
                <div>
                  <span>
                    {panelMode === "now"
                      ? "Example size"
                      : panelMode === "copy"
                        ? "Prefilled entry"
                        : "Your signed price"}
                  </span>
                  <strong>
                    {panelMode === "now"
                      ? `${setup.size} ${setup.quoteAsset}`
                      : `${formatPrice(panelMode === "copy" ? entry : setup.followerPrice)} ${setup.quoteAsset}`}
                    <small>
                      {panelMode !== "now" && ` / ${setup.orderAsset}`}
                    </small>
                  </strong>
                </div>
                <span className="network">
                  <i />
                  {setup.network}
                  {panelMode !== "now" &&
                    ` · ${setup.size} ${setup.quoteAsset}`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <EvidenceDisclosure />
    </section>
  );
}
