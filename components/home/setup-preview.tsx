"use client";
import { Sparkles } from "lucide-react";
import { exampleSetup as setup, formatPrice } from "@/lib/example-setup";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const entry = updated ? setup.revisedEntry : setup.originalEntry;
  const [beforeEntry, afterEntry] = setup.originalPost.split(setup.supportingText);
  return (
    <section id="example" aria-label="Interactive setup example">
      <div className="flex items-center justify-between border-b px-5 py-3 text-xs sm:px-6">
        <span className="flex items-center gap-2">
          <span className="flex gap-1.5" aria-hidden="true">
            <i className="size-2.5 rounded-full bg-foreground/15" />
            <i className="size-2.5 rounded-full bg-foreground/15" />
            <i className="size-2.5 rounded-full bg-foreground/15" />
          </span>
          <span className="ml-2 flex items-center gap-2 text-muted-foreground">
            <span className="live-dot" />
            Interactive example
          </span>
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">
          {setup.asset} / 001
        </span>
      </div>

      <div className="grid sm:grid-cols-[1.15fr_1fr]">
        <div className="border-b p-5 sm:border-r sm:border-b-0 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-full bg-muted border border-border-strong text-xs font-semibold text-foreground">
                D
              </span>
              <div className="leading-tight">
                <strong className="block text-xs">{setup.creator}</strong>
                <span className="text-[10px] text-muted-foreground">Illustrative X post</span>
              </div>
            </div>
            <span className="text-lg" aria-label="X">𝕏</span>
          </div>
          <blockquote className="mt-4 text-[15px] leading-7 tracking-tight">
            “{beforeEntry}
            <mark>{setup.supportingText}</mark>
            {afterEntry}”
          </blockquote>
        </div>

        <div className="p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
            Extracted terms
            <Badge variant="outline" className="gap-1 text-[10px] text-violet">
              <Sparkles />
              {setup.extractionLabel}
            </Badge>
          </div>
          <div className="mb-4 flex items-center gap-2.5">
            <span className="text-muted-foreground [&_svg]:h-6">
              <EthereumMark />
            </span>
            <strong className="text-2xl font-semibold tracking-tight">{setup.asset}</strong>
            <Badge className="ml-auto bg-success/15 text-success">{setup.direction}</Badge>
          </div>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="mb-1 text-[10px] text-muted-foreground">Creator’s entry</dt>
              <dd
                key={entry}
                className="animate-in fade-in slide-in-from-bottom-1 text-2xl font-medium tracking-tight tabular-nums duration-500"
              >
                ${formatPrice(entry)}
                <small className="block text-[10px] font-normal text-muted-foreground">or below</small>
              </dd>
            </div>
            <div>
              <dt className="mb-1 text-[10px] text-muted-foreground">Reference target</dt>
              <dd className="text-2xl font-medium tracking-tight tabular-nums">
                ${formatPrice(setup.target)}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <Tabs
        value={mode}
        onValueChange={(value) => onModeChange(value as EntryMode)}
        className="gap-0 border-t px-5 pt-4 pb-5 sm:px-6"
      >
        <TabsList aria-label="Choose how to enter" className="h-9! w-full">
          {modes.map((item) => (
            <TabsTrigger key={item.id} value={item.id} className="text-xs data-[state=active]:text-primary">
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {modes.map(({ id: panelMode }) => (
          <TabsContent
            key={panelMode}
            value={panelMode}
            className="animate-in fade-in slide-in-from-bottom-1 duration-300"
          >
            <div className="min-h-20 pt-4">
              <strong className="text-sm font-medium">
                {panelMode === "now"
                  ? "Your size. A fresh quote."
                  : panelMode === "copy"
                    ? "The creator’s entry, ready to review."
                    : "Your setup. Your entry."}
              </strong>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {panelMode === "now" ? (
                  <>Buy Now requests an immediate Uniswap quote for your size. Review it before you confirm.</>
                ) : panelMode === "copy" ? (
                  <>
                    Copy Entry prefills {formatPrice(entry)} {setup.quoteAsset} per {setup.orderAsset}.
                    Choose your size and review before signing.
                  </>
                ) : (
                  <>
                    Choose your own limit price. Here, you signed an example order at{" "}
                    {formatPrice(setup.followerPrice)} {setup.quoteAsset} per {setup.orderAsset}.
                  </>
                )}
              </p>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border bg-background/50 px-4 py-3">
              <div>
                <span className="block text-[10px] text-muted-foreground">
                  {panelMode === "now"
                    ? "Example size"
                    : panelMode === "copy"
                      ? "Prefilled entry"
                      : "Your signed price"}
                </span>
                <strong className="text-xl font-medium tracking-tight tabular-nums">
                  {panelMode === "now"
                    ? `${setup.size} ${setup.quoteAsset}`
                    : `${formatPrice(panelMode === "copy" ? entry : setup.followerPrice)} ${setup.quoteAsset}`}
                  <small className="text-xs font-normal text-muted-foreground">
                    {panelMode !== "now" && ` / ${setup.orderAsset}`}
                  </small>
                </strong>
              </div>
              <span className="flex items-center gap-1.5 text-right text-[10px] text-muted-foreground">
                <i className="size-2 rounded-full bg-[#0052ff]" />
                {setup.network}
                {panelMode !== "now" && ` · ${setup.size} ${setup.quoteAsset}`}
              </span>
            </div>
          </TabsContent>
        ))}
      </Tabs>
      <EvidenceDisclosure />
    </section>
  );
}
