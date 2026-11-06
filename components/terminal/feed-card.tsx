"use client";
import { useState, type ReactElement } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronRight, CornerDownRight, ExternalLink, PenLine, Copy, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/example-setup";
import { bundledOrder, type TradeSetup, type SetupVersion } from "@/lib/terminal-data";
import { PriceRail } from "../shared/price-rail";
import { chip, Eyebrow, label, Leader, panel } from "./panel";
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

const kindLabel = { actionable: "Clear setup", commentary: "Commentary", ambiguous: "Ambiguous" } as const;
const tradeActions: { id: Mode; label: string; icon: typeof Zap }[] = [
  { id: "now", label: "Buy now", icon: Zap },
  { id: "copy", label: "Copy entry", icon: Copy },
  { id: "custom", label: "Customize", icon: PenLine },
];

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
  /** Trade review rendered inline (small screens only). */
  review?: React.ReactNode;
}) {
  const [proofOpen, setProofOpen] = useState(false);
  const actionable = setup.kind === "actionable";
  const version = actionable ? (setup.versions.find((v) => v.id === versionId) ?? setup.versions[1]) : null;
  const evidence = actionable
    ? [
        { label: "Original entry · Setup v1", text: setup.versions[0].excerpt },
        { label: "Updated entry · Setup v2", text: setup.versions[1].excerpt },
        { label: "Reference target", text: setup.targetExcerpt },
      ]
    : setup.kind === "commentary"
      ? [{ label: "Price mention without an entry instruction", text: setup.source }]
      : [{ label: "Two conditional levels; neither is confirmed", text: setup.evidence }];
  const titleId = `${setup.id}-title`;

  return (
    <article
      aria-labelledby={titleId}
      onClick={onSelect}
      className={cn(
        panel,
        "group relative cursor-pointer p-5 transition-all duration-300 sm:p-6",
        selected
          ? "cursor-default border-primary/50 shadow-[0_0_0_1px_var(--primary),0_20px_60px_-30px_var(--primary)]"
          : "hover:border-foreground/25 hover:bg-card",
      )}
    >
      <div className="flex gap-4">
        <span className="hidden size-11 shrink-0 items-center sm:flex justify-center rounded-full bg-gradient-to-br from-violet to-primary font-sans text-sm font-semibold text-primary-foreground">
          D
        </span>
        <div className="min-w-0 flex-1">
          {/* meta row */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
            <strong className="font-sans text-sm font-semibold">{setup.creator}</strong>
            <span className="tracking-wider text-muted-foreground uppercase">{setup.timestamp}</span>
            <span className="ml-auto flex items-center gap-3">
              {setup.sourceUrl ? (
                <a
                  href={setup.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className={cn(label, "hover:text-primary")}
                >
                  Original <ExternalLink className="inline size-3" />
                </a>
              ) : (
                <span className={label}>Sample post</span>
              )}
              <button
                type="button"
                id={titleId}
                aria-expanded={selected}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect();
                }}
                className={cn(label, "flex items-center gap-1 hover:text-primary", selected && "text-primary")}
              >
                {setup.title}
                <ChevronRight className={cn("size-3 transition-transform", selected && "rotate-90")} />
              </button>
            </span>
          </div>

          <p className="mt-3 text-[15px] leading-relaxed">
            <Highlight
              text={setup.source}
              phrases={
                actionable
                  ? [setup.versions[0].excerpt, setup.targetExcerpt]
                  : setup.kind === "commentary"
                    ? [setup.targetExcerpt]
                    : []
              }
            />
          </p>
          {actionable && (
            <div className="mt-3 flex gap-2 border-l-2 border-violet pl-3 text-sm">
              <CornerDownRight className="mt-0.5 size-3.5 shrink-0 text-violet" aria-hidden="true" />
              <p>
                <Highlight text={setup.reply} phrases={[setup.versions[1].excerpt]} />
                <span className={cn(label, "ml-2")}>reply · v2</span>
              </p>
            </div>
          )}

          {/* chips */}
          <div className="mt-4 flex flex-wrap gap-2">
            <span className={chip}>{kindLabel[setup.kind]}</span>
            <span className={cn(chip, actionable ? "border-success/50 text-success" : "text-muted-foreground")}>
              ${setup.asset}
              {actionable ? <>▲ <span className="normal-case tracking-normal">buy</span></> : " · no direction"}
            </span>
            <span className={cn(chip, actionable ? "border-primary/40 text-primary" : "text-muted-foreground")}>
              {setup.status}
            </span>
          </div>

          {/* leader rows */}
          <div className="mt-4 grid gap-2">
            <Leader name="Entry">
              {actionable ? (
                <>
                  <span key={versionId} className="animate-in fade-in text-primary">
                    ${formatPrice(version!.entryUSD)}
                  </span>
                  {version!.id === "v2" && (
                    <s className="ml-2 font-normal text-muted-foreground">${formatPrice(setup.versions[0].entryUSD)}</s>
                  )}
                </>
              ) : (
                <span className="font-normal text-muted-foreground">not confirmed</span>
              )}
            </Leader>
            <Leader name={setup.kind === "commentary" ? "Mentioned" : "Target"}>
              {setup.kind !== "ambiguous" ? `$${formatPrice(setup.targetUSD)}` : <span className="font-normal text-muted-foreground">—</span>}
            </Leader>
          </div>

          {/* proof */}
          <div className="mt-4 rounded-sm border border-success/30 bg-success/5">
            <button
              type="button"
              aria-expanded={proofOpen}
              onClick={(e) => {
                e.stopPropagation();
                setProofOpen((v) => !v);
              }}
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[11px]"
            >
              <span className="size-2 rounded-full bg-success shadow-[0_0_8px_var(--success)]" />
              <span className="font-semibold tracking-[0.15em] text-success uppercase">
                AI-extracted <Check className="inline size-3" />
              </span>
              <span className="hidden text-muted-foreground sm:inline">· example extraction</span>
              <span className="ml-auto font-semibold">
                {proofOpen ? "hide" : "show"} extraction {proofOpen ? "▾" : "▸"}
              </span>
            </button>
            <AnimatePresence initial={false}>
              {proofOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="grid gap-0 border-t border-success/20 px-3 py-3 text-xs">
                    <p className={cn(label, "mb-2")}>{"// Extraction evidence"}</p>
                    {evidence.map((entry) => (
                      <div key={entry.label} className="flex flex-wrap justify-between gap-2 border-b border-dashed py-2 last:border-0">
                        <span className={label}>{entry.label}</span>
                        <span className="text-right">“{entry.text}”</span>
                      </div>
                    ))}
                    <div className="flex flex-wrap justify-between gap-2 border-t py-2">
                      <span className={label}>Verification</span>
                      <span>{setup.extraction?.verificationStatus ?? "Example extraction · not independently verified"}</span>
                    </div>
                    {setup.extraction?.requestId && (
                      <div className="flex justify-between gap-2 py-2">
                        <span className={label}>0G request ID</span>
                        <code>{setup.extraction.requestId}</code>
                      </div>
                    )}
                    <p className="mt-1 text-[10px] tracking-wider text-success uppercase">
                      Example extraction. Source text is bundled sample data.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* actions */}
          <div className="mt-4 flex flex-wrap items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <div className="inline-flex divide-x overflow-hidden rounded-full border" role="group" aria-label="Choose how to enter">
              {tradeActions.map(({ id, label: text, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  disabled={!actionable}
                  onClick={() => onTrade(id)}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-[10px] tracking-[0.14em] uppercase transition-colors hover:bg-primary hover:text-primary-foreground disabled:pointer-events-none disabled:opacity-40"
                >
                  <Icon className="size-3" />
                  {text}
                </button>
              ))}
            </div>
            <span className={label}>{actionable ? "Demo · no wallet" : "No clear entry · inspect only"}</span>
          </div>
        </div>
      </div>

      {/* expanded detail */}
      <AnimatePresence initial={false}>
        {selected && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-6 grid gap-6 border-t border-dashed pt-6">
              {review}
              {actionable && version ? (
                <CreatorUpdate setup={setup} version={version} onVersionChange={onVersionChange} />
              ) : (
                <div>
                  <Eyebrow>Why no trade</Eyebrow>
                  <h3 className="mt-2 font-sans text-lg font-semibold">{setup.status}</h3>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                    {setup.kind === "commentary"
                      ? "A price mention is not an entry instruction. This post does not say where the creator plans to buy."
                      : "The creator mentions two possible prices without committing to either. Neither is treated as a confirmed entry."}{" "}
                    You can inspect the source and extraction. Trade actions are unavailable for this sample.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
    <section aria-labelledby={`${setup.id}-update`} onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Signed terms stay yours</Eyebrow>
          <h3 id={`${setup.id}-update`} className="mt-1 font-sans text-lg font-semibold">
            Creator update · ${formatPrice(setup.versions[0].entryUSD)}{" "}
            <span className="text-violet">→</span> ${formatPrice(setup.versions[1].entryUSD)}{" "}
            <small className="text-xs text-muted-foreground">USD</small>
          </h3>
        </div>
        <div className="inline-flex divide-x overflow-hidden rounded-full border" role="group" aria-label="Setup version">
          {(
            [
              ["v1", "Original"],
              ["v2", "Updated"],
            ] as const
          ).map(([id, text]) => (
            <button
              key={id}
              type="button"
              aria-pressed={version.id === id}
              onClick={() => onVersionChange(id)}
              className="px-4 py-1.5 text-[10px] tracking-[0.14em] uppercase transition-colors hover:text-foreground aria-pressed:bg-violet aria-pressed:text-white"
            >
              {text}
            </button>
          ))}
        </div>
      </div>
      <div className={cn(label, "mt-5 flex justify-between")}>
        <span>Illustrative</span>
        <span>Viewing setup {version.id}</span>
      </div>
      <PriceRail updated={updated} explicitUnits />
      <p className="text-sm">
        The creator moved their entry to $2,350. Your example order is still open at 2,375 USDC per WETH.
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {!updated
          ? "Viewing the original entry on the rail. The current setup is v2."
          : "The rail compares entry levels, not a live price or USD-to-USDC conversion."}
      </p>
      <div className="mt-5 grid gap-2">
        <Leader name="Your example order">{formatPrice(bundledOrder.limitUSDCPerWETH)} USDC / WETH</Leader>
        <Leader name="Size">{bundledOrder.sizeUSDC} USDC</Leader>
        <Leader name="Status">Open · Simulated</Leader>
        <Leader name="Order source">Setup {bundledOrder.setupVersion}</Leader>
      </div>
      <ol className="mt-6 ml-1 grid gap-4 border-l border-dashed pl-5" aria-label="Setup history">
        {setup.versions.map((v) => {
          const active = version.id === v.id;
          return (
            <li key={v.id} className="relative">
              <span
                className={cn(
                  "absolute top-1 -left-[25px] size-2.5 rounded-full border-2 border-card transition-all",
                  active ? "bg-violet shadow-[0_0_10px_var(--violet)]" : "bg-muted-foreground/40",
                )}
              />
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
                <strong className={cn("font-semibold uppercase tracking-wider", !active && "text-muted-foreground")}>
                  Setup {v.id} · ${formatPrice(v.entryUSD)} USD
                </strong>
                <span className={label}>{v.id === "v1" ? "Example order source" : "Current creator entry"}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">“{v.excerpt}”</p>
              <small className="text-[10px] text-muted-foreground/70">{v.timestamp}</small>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
