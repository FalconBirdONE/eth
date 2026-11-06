"use client";
import type { ReactElement } from "react";
import { CircleSlash, CornerDownRight, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/example-setup";
import { bundledOrder, type TradeSetup, type SetupVersion } from "@/lib/terminal-data";
import type { TradeReviewRequest } from "@/lib/trade-provider";
import { EthereumMark, ArrowIcon } from "../home/icons";
import { EvidenceDisclosure } from "../home/evidence-disclosure";
import { PriceRail } from "../shared/price-rail";
import { TradeReview } from "./trade-review";
import { Eyebrow, panel } from "./panel";

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
          { label: "Original entry · Setup v1", text: setup.versions[0].excerpt },
          { label: "Updated entry · Setup v2", text: setup.versions[1].excerpt },
          { label: "Reference target", text: setup.targetExcerpt },
        ]
      : setup.kind === "commentary"
        ? [{ label: "Price mention without an entry instruction", text: setup.source }]
        : [{ label: "Two conditional levels; neither is confirmed", text: setup.evidence }];
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500" key={setup.id}>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <Eyebrow>Selected setup</Eyebrow>
          <h1
            id="selected-setup-title"
            tabIndex={-1}
            className="mt-1 text-3xl font-semibold tracking-tight outline-none sm:text-4xl"
          >
            {setup.title}
          </h1>
          <p className="mt-1 text-sm">
            {setup.creator}
            <span className="ml-2 text-muted-foreground">From X · {setup.timestamp}</span>
          </p>
        </div>
        <Badge
          variant={setup.kind === "actionable" ? "default" : "secondary"}
          className={cn("mt-1", setup.kind === "actionable" && "bg-primary/15 text-primary")}
        >
          {setup.status}
        </Badge>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid min-w-0 content-start gap-6">
          <section className={cn(panel, "grid gap-6 p-5 sm:grid-cols-[auto_1fr_1fr] sm:p-6")} aria-label="Setup terms">
            <span className="flex items-center gap-2.5 [&_svg]:h-7 [&_svg]:text-muted-foreground">
              <EthereumMark />
              <strong className="text-2xl font-semibold">ETH</strong>
              {setup.kind === "actionable" && (
                <Badge className="bg-success/15 text-success">Buy</Badge>
              )}
            </span>
            <Stat
              label={version ? "Creator’s entry" : "Detected entry"}
              value={version ? `$${formatPrice(version.entryUSD)}` : "Not confirmed"}
              muted={!version}
              valueKey={version?.id}
              note={
                version
                  ? updated
                    ? `Previous: $${formatPrice(setup.kind === "actionable" ? setup.versions[0].entryUSD : version.entryUSD)} USD`
                    : "Original entry · Setup v1"
                  : setup.status
              }
            />
            <Stat
              label={setup.kind === "commentary" ? "Mentioned level" : "Reference target"}
              value={setup.kind !== "ambiguous" ? `$${formatPrice(setup.targetUSD)}` : "—"}
              note={
                setup.kind === "ambiguous"
                  ? "No confirmed target"
                  : setup.kind === "commentary"
                    ? "USD · not an entry"
                    : "USD · reference only"
              }
            />
          </section>

          {version && (
            <Button asChild variant="outline" className="justify-between xl:hidden">
              <a href="#trade-review">
                Choose how to enter
                <ArrowIcon className="size-4" />
              </a>
            </Button>
          )}

          <section className={cn(panel, "overflow-hidden")} aria-label="Source post">
            <div className="p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-violet to-primary text-xs font-semibold text-primary-foreground">
                    D
                  </span>
                  <div className="leading-tight">
                    <strong className="block text-sm">{setup.creator}</strong>
                    <span className="text-[11px] text-muted-foreground">Original X post · sample</span>
                  </div>
                </div>
                <span className="text-lg" aria-label="X">𝕏</span>
              </div>
              <blockquote className="mt-4 text-lg leading-relaxed tracking-tight">
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
                <div className="mt-4 flex gap-3 rounded-xl border-l-2 border-violet bg-violet/5 p-3">
                  <CornerDownRight className="mt-0.5 size-4 shrink-0 text-violet" aria-hidden="true" />
                  <div>
                    <span className="text-[11px] text-muted-foreground">Creator’s reply · Setup v2</span>
                    <p className="text-sm">
                      “<Highlight text={setup.reply} phrases={[setup.versions[1].excerpt]} />”
                    </p>
                  </div>
                </div>
              )}
              {setup.sourceUrl && (
                <a
                  href={setup.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  View source on X <ExternalLink className="size-3" />
                </a>
              )}
            </div>
            <EvidenceDisclosure
              label="View extraction"
              entries={evidence}
              note="Example extraction. Source text is bundled sample data."
              verification={{
                status:
                  setup.extraction?.verificationStatus ?? "Example extraction · not independently verified",
                requestId: setup.extraction?.requestId,
              }}
            />
          </section>

          {setup.kind === "actionable" && version ? (
            <CreatorUpdate setup={setup} version={version} updated={updated} onVersionChange={onVersionChange} />
          ) : (
            <section className={cn(panel, "border-dashed p-6 sm:p-8")}>
              <span className="flex size-10 items-center justify-center rounded-xl bg-muted text-muted-foreground" aria-hidden="true">
                <CircleSlash className="size-5" />
              </span>
              <h2 className="mt-4 text-xl font-semibold">{setup.status}</h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                {setup.kind === "commentary"
                  ? "A price mention is not an entry instruction. This post does not say where the creator plans to buy."
                  : "The creator mentions two possible prices without committing to either. Neither is treated as a confirmed entry."}
              </p>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                You can inspect the source and extraction. Trade actions are unavailable for this sample.
              </p>
            </section>
          )}
        </div>

        {setup.kind === "actionable" && version ? (
          <TradeReview setupId={setup.id} version={version} onSave={onSave} />
        ) : (
          <aside className={cn(panel, "h-fit p-6 xl:sticky xl:top-28")}>
            <Eyebrow>Trade review</Eyebrow>
            <h2 className="mt-1 text-xl font-semibold">A clear entry comes first.</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {setup.kind === "commentary" ? "No entry detected." : "Entry needs clarification."} No creator price
              has been prefilled.
            </p>
            <div className="mt-5 grid gap-2" aria-label="Unavailable trade actions">
              {["Buy Now", "Copy Entry", "Customize Entry"].map((label) => (
                <Button key={label} variant="outline" disabled>
                  {label}
                </Button>
              ))}
            </div>
            <p className="mt-4 text-[11px] text-muted-foreground">
              Choose the ETH buy setup to explore the demo trade flow.
            </p>
          </aside>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  note,
  muted,
  valueKey,
}: {
  label: string;
  value: string;
  note: string;
  muted?: boolean;
  valueKey?: string;
}) {
  return (
    <div>
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <strong
        key={valueKey}
        className={cn(
          "animate-in fade-in slide-in-from-bottom-1 block font-semibold tracking-tight tabular-nums duration-500",
          muted ? "text-lg text-muted-foreground" : "text-3xl",
        )}
      >
        {value}
      </strong>
      <small className="text-[11px] text-muted-foreground">{note}</small>
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
    <section className={cn(panel, "p-5 sm:p-6")} aria-labelledby="creator-update-heading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Signed terms stay yours</Eyebrow>
          <h2 id="creator-update-heading" className="mt-1 text-xl font-semibold">
            Creator update
          </h2>
        </div>
        <div className="flex gap-1 rounded-full border bg-background/60 p-1" role="group" aria-label="Setup version">
          {(
            [
              ["v1", "Original", !updated],
              ["v2", "Updated", updated],
            ] as const
          ).map(([id, label, pressed]) => (
            <button
              key={id}
              type="button"
              aria-pressed={pressed}
              onClick={() => onVersionChange(id)}
              className="rounded-full px-4 py-1.5 text-xs text-muted-foreground transition-all hover:text-foreground aria-pressed:bg-violet aria-pressed:text-white"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2 rounded-xl bg-muted/50 px-4 py-3">
        <span className="text-xs text-muted-foreground">Creator’s entry</span>
        <strong className="text-lg font-semibold tabular-nums">
          ${formatPrice(setup.versions[0].entryUSD)} <span aria-hidden="true" className="text-violet">→</span> $
          {formatPrice(setup.versions[1].entryUSD)} <small className="text-xs text-muted-foreground">USD</small>
        </strong>
      </div>

      <div className="mt-5 flex justify-between font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
        <span>Illustrative</span>
        <span>Viewing Setup {version.id}</span>
      </div>
      <PriceRail updated={updated} explicitUnits />
      <p className="text-sm font-medium">
        The creator moved their entry to $2,350. Your example order is still open at 2,375 USDC per WETH.
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {!updated
          ? "Viewing the original entry on the rail. The current setup is v2."
          : "The rail compares entry levels, not a live price or USD-to-USDC conversion."}
      </p>

      <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-4">
        {[
          ["Your example order", `${formatPrice(bundledOrder.limitUSDCPerWETH)} USDC per WETH`],
          ["Size", `${bundledOrder.sizeUSDC} USDC`],
          ["Status", "Open · Simulated"],
          ["Order source", `Setup ${bundledOrder.setupVersion}`],
        ].map(([dt, dd]) => (
          <div key={dt} className="bg-card p-3">
            <dt className="text-[11px] text-muted-foreground">{dt}</dt>
            <dd className="mt-0.5 text-sm font-medium">{dd}</dd>
          </div>
        ))}
      </dl>

      <ol className="relative mt-6 ml-1 grid gap-5 border-l pl-6" aria-label="Setup history">
        {setup.versions.map((v) => {
          const active = version.id === v.id;
          return (
            <li key={v.id} className="relative">
              <span
                className={cn(
                  "absolute top-1.5 -left-[29px] size-2.5 rounded-full border-2 border-background transition-all",
                  active ? "bg-violet shadow-[0_0_10px_var(--violet)]" : "bg-muted-foreground/40",
                )}
              />
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <strong className={cn("text-sm font-semibold", !active && "text-muted-foreground")}>
                  Setup {v.id} <b className="ml-1 font-medium tabular-nums">${formatPrice(v.entryUSD)} USD</b>
                </strong>
                <span className="text-[11px] text-muted-foreground">
                  {v.id === "v1" ? "Example order source" : "Current creator entry"}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">“{v.excerpt}”</p>
              <small className="text-[11px] text-muted-foreground/70">{v.timestamp}</small>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
