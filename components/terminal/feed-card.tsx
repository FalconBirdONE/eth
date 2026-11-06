"use client";
import { useState, type ReactElement, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/example-setup";
import { bundledOrder, type TradeSetup, type SetupVersion } from "@/lib/terminal-data";
import { PriceRail } from "../shared/price-rail";
import { chip, Eyebrow, label, panel, Row, segment, Track } from "./panel";
import type { Mode } from "./trade-review";

function Highlight({ text, phrases }: { text: string; phrases: string[] }) {
  let parts: (string | ReactElement)[] = [text];
  for (const phrase of phrases.filter(Boolean))
    parts = parts.flatMap<string | ReactElement>((part, index) =>
      typeof part !== "string"
        ? [part]
        : part
            .split(phrase)
            .flatMap((segment, i) =>
              i ? [<mark key={`${phrase}-${index}-${i}`}>{phrase}</mark>, segment] : [segment],
            ),
    );
  return <>{parts}</>;
}

const kindLabel = { actionable: "Clear setup", commentary: "Commentary", ambiguous: "Conditional" } as const;
const tradeActions: { id: Mode; arrow: string; label: string }[] = [
  { id: "now", arrow: "▲", label: "Buy now" },
  { id: "copy", arrow: "⧉", label: "Copy entry" },
  { id: "custom", arrow: "✎", label: "Customize" },
];
const ease = [0.16, 1, 0.3, 1] as const;

function Expand({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.35, ease }}
          className="overflow-hidden"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function FeedCard({
  setup,
  selected,
  versionId,
  onSelect,
  onTrade,
  onVersionChange,
  review,
}: {
  setup: TradeSetup;
  selected: boolean;
  versionId: "v1" | "v2";
  onSelect: () => void;
  onTrade: (mode: Mode) => void;
  onVersionChange: (id: "v1" | "v2") => void;
  /** Trade review rendered inline (narrow screens only). */
  review?: ReactNode;
}) {
  const [proofOpen, setProofOpen] = useState(false);
  const actionable = setup.kind === "actionable";
  const version = actionable ? (setup.versions.find((v) => v.id === versionId) ?? setup.versions[1]) : null;
  const evidence = actionable
    ? [
        { label: "Original entry · v1", text: setup.versions[0].excerpt },
        { label: "Updated entry · v2", text: setup.versions[1].excerpt },
        { label: "Reference target", text: setup.targetExcerpt },
      ]
    : setup.kind === "commentary"
      ? [{ label: "Price mention, no entry", text: setup.source }]
      : [{ label: "Two conditional levels", text: setup.evidence }];
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  return (
    <article
      aria-labelledby={`${setup.id}-title`}
      onClick={onSelect}
      className={cn(
        panel,
        "flex gap-3.5 p-5 transition-[border-color,box-shadow] duration-200",
        selected
          ? "border-foreground shadow-[inset_3px_0_0_0_var(--foreground),4px_4px_0_0_var(--border)]"
          : "cursor-pointer hover:border-border-strong",
      )}
    >
      <span
        aria-hidden="true"
        className="hidden size-[42px] shrink-0 items-center justify-center rounded-[3px] bg-foreground font-sans text-base font-semibold text-background sm:flex"
      >
        D
      </span>
      <div className="min-w-0 flex-1">
        {/* meta */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-sans text-[15px] font-semibold">{setup.creator}</span>
          <span className="text-[10px] tracking-[0.04em] text-subtle uppercase">sample</span>
          <span className={label}>· {setup.timestamp}</span>
          <span className="ml-auto flex items-center gap-3">
            {setup.sourceUrl ? (
              <a href={setup.sourceUrl} target="_blank" rel="noreferrer" onClick={stop} className={cn(label, "hover:text-foreground")}>
                Original ↗
              </a>
            ) : null}
            <button
              type="button"
              id={`${setup.id}-title`}
              aria-expanded={selected}
              onClick={(e) => {
                stop(e);
                onSelect();
              }}
              className={cn(label, "hover:text-foreground", selected && "text-foreground")}
            >
              {setup.title} <span aria-hidden="true">{selected ? "▾" : "▸"}</span>
            </button>
          </span>
        </div>

        <p className="mt-2 text-[15px] leading-[1.55]">
          <Highlight
            text={setup.source}
            phrases={actionable ? [setup.versions[0].excerpt, setup.targetExcerpt] : setup.kind === "commentary" ? [setup.targetExcerpt] : []}
          />
        </p>
        {actionable && (
          <p className="mt-2 border-l-2 border-border-strong pl-3 text-sm text-muted-foreground">
            ↳ <Highlight text={setup.reply} phrases={[setup.versions[1].excerpt]} />
            <span className={cn(label, "ml-2")}>reply · v2</span>
          </p>
        )}

        {/* chips */}
        <div className="mt-3 flex flex-wrap gap-2">
          <span className={chip}>{kindLabel[setup.kind]}</span>
          <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-border-strong px-3 text-xs tracking-[0.05em]">
            <span className={actionable ? "text-success" : "text-foreground"}>${setup.asset}</span>
            <span className="text-subtle">{actionable ? "▲ buy" : "— no call"}</span>
          </span>
          <span className={chip}>{actionable ? `Setup ${version!.id} · updated` : setup.status}</span>
        </div>

        {/* tracks */}
        <div className="mt-3 grid gap-2">
          <Track name="Entry" filled={actionable}>
            {actionable ? (
              <span key={versionId} className="animate-in fade-in">
                ${formatPrice(version!.entryUSD)}
                {version!.id === "v2" && (
                  <s className="ml-1.5 font-normal text-subtle">${formatPrice(setup.versions[0].entryUSD)}</s>
                )}
              </span>
            ) : (
              "not confirmed"
            )}
          </Track>
          <Track name={setup.kind === "commentary" ? "Mentioned" : "Target"} filled={setup.kind !== "ambiguous"}>
            {setup.kind !== "ambiguous" ? `$${formatPrice(setup.targetUSD)}` : "—"}
          </Track>
        </div>

        {/* proof */}
        <button
          type="button"
          aria-expanded={proofOpen}
          onClick={(e) => {
            stop(e);
            setProofOpen((v) => !v);
          }}
          className="mt-3 flex w-full items-center gap-2 rounded-[3px] border border-success-line bg-success-soft px-3 py-2.5 text-left text-[11px] tracking-[0.04em] text-muted-foreground"
        >
          <span className="size-2 rounded-full bg-success" />
          <span className="font-semibold tracking-[0.09em] text-success uppercase">AI-extracted ✓</span>
          <span className="hidden text-subtle sm:inline">· example extraction</span>
          <span className="ml-auto font-semibold text-foreground">
            {proofOpen ? "hide" : "show"} full proof <span className="text-subtle">{proofOpen ? "▾" : "▸"}</span>
          </span>
        </button>
        <Expand open={proofOpen}>
          <div className="mt-3 rounded-[3px] border bg-muted/60 px-4 py-3" onClick={stop}>
            <p className={cn(label, "mb-2")}>{"// Extraction evidence · bundled sample data"}</p>
            {evidence.map((entry) => (
              <Row key={entry.label} name={entry.label}>
                “{entry.text}”
              </Row>
            ))}
            <Row name="Verification">
              {setup.extraction?.verificationStatus ?? "Example · not independently verified"}
            </Row>
            {setup.extraction?.requestId && <Row name="0G request ID">{setup.extraction.requestId}</Row>}
          </div>
        </Expand>

        {/* actions */}
        <div className="mt-3 flex flex-wrap items-center gap-3" onClick={stop}>
          <div className="inline-flex overflow-hidden rounded-full border border-border-strong bg-card" role="group" aria-label="Choose how to enter">
            {tradeActions.map(({ id, arrow, label: text }, i) => (
              <button
                key={id}
                type="button"
                disabled={!actionable}
                onClick={() => onTrade(id)}
                className={cn(
                  "flex h-[34px] items-center gap-2 px-3 text-[10px] whitespace-nowrap sm:px-4 sm:text-[11px] tracking-[0.08em] text-muted-foreground uppercase transition-colors hover:bg-primary hover:text-primary-foreground disabled:pointer-events-none disabled:opacity-40",
                  i > 0 && "border-l",
                )}
              >
                <span aria-hidden="true" className="hidden sm:inline">{arrow}</span>
                {text}
              </button>
            ))}
          </div>
          <span className={label}>{actionable ? "Demo · no wallet" : "Inspect only"}</span>
        </div>

        {/* expanded detail */}
        <Expand open={selected}>
          <div className="mt-5 grid gap-6 border-t border-dashed pt-5" onClick={stop}>
            {review}
            {actionable && version ? (
              <CreatorUpdate setup={setup} version={version} onVersionChange={onVersionChange} />
            ) : (
              <div>
                <Eyebrow>Why no trade</Eyebrow>
                <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-muted-foreground">
                  {setup.kind === "commentary"
                    ? "A price mention is not an entry instruction. This post does not say where the creator plans to buy."
                    : "The creator mentions two possible prices without committing to either. Neither is treated as a confirmed entry."}{" "}
                  You can inspect the source and extraction. Trade actions are unavailable for this sample.
                </p>
              </div>
            )}
          </div>
        </Expand>
      </div>
    </article>
  );
}

function CreatorUpdate({
  setup,
  version,
  onVersionChange,
}: {
  setup: Extract<TradeSetup, { kind: "actionable" }>;
  version: SetupVersion;
  onVersionChange: (id: "v1" | "v2") => void;
}) {
  const updated = version.id === "v2";
  return (
    <section aria-labelledby={`${setup.id}-update`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Eyebrow>Signed terms stay yours</Eyebrow>
          <h3 id={`${setup.id}-update`} className="mt-1 font-sans text-lg font-semibold">
            Creator update · ${formatPrice(setup.versions[0].entryUSD)} → ${formatPrice(setup.versions[1].entryUSD)}{" "}
            <small className="text-xs font-normal text-subtle">USD</small>
          </h3>
        </div>
        <div className="flex overflow-hidden rounded-[3px] border" role="group" aria-label="Setup version">
          {(
            [
              ["v1", "Original"],
              ["v2", "Updated"],
            ] as const
          ).map(([id, text]) => (
            <button key={id} type="button" aria-pressed={version.id === id} onClick={() => onVersionChange(id)} className={segment}>
              {text}
            </button>
          ))}
        </div>
      </div>
      <div className={cn(label, "mt-4 flex justify-between")}>
        <span>Illustrative</span>
        <span>Viewing setup {version.id}</span>
      </div>
      <PriceRail updated={updated} explicitUnits />
      <p className="text-[13px]">
        The creator moved their entry to $2,350. Your example order is still open at 2,375 USDC per WETH.
      </p>
      <p className="mt-1 text-[11px] text-subtle">
        {!updated
          ? "Viewing the original entry on the rail. The current setup is v2."
          : "The rail compares entry levels, not a live price or USD-to-USDC conversion."}
      </p>
      <div className="mt-4 rounded-[3px] border bg-muted/60 px-4 py-1">
        <Row name="Your example order">{formatPrice(bundledOrder.limitUSDCPerWETH)} USDC / WETH</Row>
        <Row name="Size">{bundledOrder.sizeUSDC} USDC</Row>
        <Row name="Status">Open · Simulated</Row>
        <Row name="Order source">Setup {bundledOrder.setupVersion}</Row>
      </div>
      <ol className="mt-5 grid gap-4" aria-label="Setup history">
        {setup.versions.map((v, i) => {
          const active = version.id === v.id;
          return (
            <li key={v.id} className="flex gap-3">
              <span className={cn("w-4 pt-0.5 text-[11px] tabular-nums", active ? "text-foreground" : "text-subtle")}>{i + 1}</span>
              <div className="flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
                  <strong className={cn("font-semibold", !active && "text-subtle")}>
                    Setup {v.id} · ${formatPrice(v.entryUSD)} USD
                  </strong>
                  <span className={label}>{v.id === "v1" ? "Example order source" : "Current creator entry"}</span>
                </div>
                <p className="mt-0.5 text-[13px] text-muted-foreground">“{v.excerpt}”</p>
                <small className="text-[10px] text-subtle">{v.timestamp}</small>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
