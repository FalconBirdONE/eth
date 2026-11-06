"use client";
import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Wordmark } from "../home/navbar";
import { formatPrice } from "@/lib/example-setup";
import { terminalSetups, type TradeSetup } from "@/lib/terminal-data";
import { useDemoOrders } from "@/lib/demo-orders";
import type { TradeReviewRequest } from "@/lib/trade-provider";
import { FeedCard } from "./feed-card";
import { OrdersPanel } from "./orders-panel";
import { TradeReview, type Mode } from "./trade-review";
import { Eyebrow, label, panel, segment } from "./panel";

const XL = "(min-width: 1280px)";
function useIsXl() {
  return useSyncExternalStore(
    (cb) => {
      const m = matchMedia(XL);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => matchMedia(XL).matches,
    () => true,
  );
}

type Filter = "all" | "setups" | "review";
const filters: [Filter, string][] = [
  ["all", "All posts"],
  ["setups", "Clear setups"],
  ["review", "Needs review"],
];
const clearCount = terminalSetups.filter((s) => s.kind === "actionable").length;

export function TerminalApp() {
  const [tab, setTab] = useState<"feed" | "orders">("feed");
  const [selectedId, setSelectedId] = useState("eth-buy");
  const [versionId, setVersionId] = useState<"v1" | "v2">("v2");
  const [mode, setMode] = useState<Mode>("copy");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [sampleOpen, setSampleOpen] = useState(false);
  const isXl = useIsXl();
  const { orders, createdCount, save, reset } = useDemoOrders();
  const selected = terminalSetups.find((setup) => setup.id === selectedId) ?? terminalSetups[0];
  const q = query.trim().toLowerCase();
  const visible = terminalSetups.filter(
    (s) =>
      (filter === "all" || (filter === "setups") === (s.kind === "actionable")) &&
      (!q || [s.creator, s.title, s.source, `$${s.asset}`].some((t) => t.toLowerCase().includes(q))),
  );

  function select(setup: TradeSetup) {
    if (setup.id !== selectedId) setVersionId("v2");
    setSelectedId(setup.id);
    setTab("feed");
  }
  function trade(setup: TradeSetup, next: Mode) {
    select(setup);
    setMode(next);
    setTimeout(
      () => document.getElementById("trade-review")?.scrollIntoView({ behavior: "smooth", block: "nearest" }),
      350,
    );
  }
  function saveReview(request: TradeReviewRequest) {
    try {
      save(request);
      toast.success(
        request.type === "limit"
          ? `Limit order simulated at ${formatPrice(request.limitUSDCPerWETH)} USDC per WETH · Setup ${request.setupVersion}.`
          : "Swap simulated. The illustrative result is saved in My Orders.",
        { action: { label: "View My Orders", onClick: () => setTab("orders") }, duration: 8000 },
      );
    } catch {
      toast.error("Your browser could not save this simulation. Enable local storage and try again.");
    }
  }
  function resetDemo() {
    try {
      reset();
      toast("Demo reset. Your simulations were cleared; the bundled example remains.");
    } catch {
      toast.error("Demo storage could not be cleared. Check your browser storage settings.");
    }
  }

  const activeVersion =
    selected.kind === "actionable" ? (selected.versions.find((v) => v.id === versionId) ?? selected.versions[1]) : null;
  const review = activeVersion ? (
    <TradeReview setupId={selected.id} version={activeVersion} mode={mode} onModeChange={setMode} onSave={saveReview} />
  ) : (
    <div>
      <Eyebrow>Trade review</Eyebrow>
      <h2 className="mt-1 font-sans text-lg font-semibold">A clear entry comes first.</h2>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {selected.kind === "commentary" ? "No entry detected." : "Entry needs clarification."} No creator price has
        been prefilled. Choose the ETH buy setup to explore the demo trade flow.
      </p>
    </div>
  );

  return (
    <div className="relative isolate min-h-screen font-mono text-sm">
      <div
        aria-hidden="true"
        className="bg-halftone pointer-events-none absolute inset-x-0 top-0 -z-10 h-[560px] [mask-image:radial-gradient(ellipse_45%_60%_at_50%_10%,black_20%,transparent_75%)]"
      />
      <a
        className="sr-only z-[60] rounded-[3px] bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        href="#terminal-main"
      >
        Skip to terminal
      </a>

      {/* header */}
      <header className="relative z-40 border-b bg-background/80 backdrop-blur-md sm:sticky sm:top-0">
        <nav className="flex min-h-14 flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2 sm:px-6" aria-label="Terminal navigation">
          <span className="font-sans [&_svg]:size-6">
            <Wordmark />
          </span>
          <div className="order-last flex w-full gap-5 sm:order-none sm:w-auto" role="group" aria-label="Terminal view">
            {(
              [
                ["feed", "Terminal"],
                ["orders", `My orders · ${orders.length}`],
              ] as const
            ).map(([id, text]) => (
              <button
                key={id}
                type="button"
                aria-pressed={tab === id}
                onClick={() => setTab(id)}
                className="relative py-1.5 text-[11px] tracking-[0.18em] text-muted-foreground uppercase transition-colors hover:text-foreground aria-pressed:text-foreground"
              >
                {text}
                {tab === id && <motion.span layoutId="terminal-tab" className="absolute inset-x-0 -bottom-px h-px bg-foreground" />}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2.5">
            <div className="flex overflow-hidden rounded-[3px] border border-border-strong">
              <span aria-current="true" className={cn(segment, "bg-primary text-primary-foreground")}>
                Demo
              </span>
              <span className={cn(segment, "cursor-not-allowed opacity-50")} title="Live trading is not connected">
                Live
              </span>
            </div>
            <Button
              size="sm"
              type="button"
              onClick={resetDemo}
              disabled={!createdCount}
              className="h-8 rounded-[3px] px-3 text-[11px] tracking-[0.08em] uppercase"
            >
              Reset demo
            </Button>
          </div>
        </nav>
      </header>

      <main id="terminal-main" className="mx-auto max-w-[1192px] px-4 pb-20 sm:px-6 xl:px-0">
        {/* analyze */}
        <div className="mx-auto max-w-[680px] pt-14 pb-11 sm:pt-24">
          <p className={cn(label, "mb-2.5 text-center")}>{"// Analyze an X post"}</p>
          <button
            type="button"
            onClick={() => setSampleOpen(true)}
            aria-haspopup="dialog"
            className="flex h-[54px] w-full items-center gap-2.5 rounded-full border bg-card px-5 text-left font-sans text-base text-subtle transition-colors hover:border-border-strong"
          >
            <Search className="size-[18px]" aria-hidden="true" />
            Paste a post link — or try the sample
          </button>
        </div>

        {tab === "orders" ? (
          <OrdersPanel orders={orders} onFeed={() => setTab("feed")} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,604px)_320px]">
            {/* left */}
            <aside className="grid content-start gap-5 lg:sticky lg:top-20 lg:self-start" aria-labelledby="feed-heading">
              <div>
                <Eyebrow>Live feed</Eyebrow>
                <h1 id="feed-heading" className="mt-1 font-sans text-[30px] leading-tight font-bold tracking-[-0.02em]">
                  Terminal
                </h1>
                <p className={cn(label, "mt-2 flex items-center gap-2 text-muted-foreground")}>
                  <span className="live-dot" /> Demo · sample data
                </p>
              </div>
              <label className="grid gap-2">
                <span className={label}>Search feed</span>
                <span className="flex h-10 items-center gap-2 rounded-[3px] border bg-card px-3 focus-within:border-border-strong">
                  <span aria-hidden="true" className="text-subtle">⌕</span>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="creator, $ticker, text"
                    className="w-full bg-transparent text-xs outline-none placeholder:text-subtle"
                  />
                </span>
              </label>
              <div>
                <p className={cn(label, "mb-2")}>Filter</p>
                <div className="grid grid-cols-3 gap-1.5 lg:grid-cols-1" role="group" aria-label="Filter feed">
                  {filters.map(([id, text]) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={filter === id}
                      onClick={() => setFilter(id)}
                      className="h-[37px] rounded-[3px] border px-3 text-left text-xs tracking-[0.04em] text-muted-foreground transition-colors hover:border-border-strong aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                    >
                      {text}
                    </button>
                  ))}
                </div>
              </div>
              <div className={cn(panel, "hidden overflow-hidden lg:block")}>
                <div className="flex h-[84px] items-center justify-center gap-[3px] bg-foreground px-3" aria-hidden="true">
                  {Array.from({ length: 26 }, (_, i) => (
                    <span
                      key={i}
                      className="h-full w-[5px] origin-center bg-[radial-gradient(circle,oklch(1_0_0/80%)_0.8px,transparent_1.2px)] [background-size:4px_4px]"
                      style={{ animation: `wave ${1.6 + (i % 5) * 0.25}s ease-in-out ${i * 0.08}s infinite` }}
                    />
                  ))}
                </div>
                <div className="grid gap-1 px-3.5 py-3">
                  <p className={cn(label, "mb-1 text-muted-foreground")}>Signal integrity</p>
                  {[
                    ["Indexed", terminalSetups.length],
                    ["Clear setups", clearCount],
                    ["Needs review", terminalSetups.length - clearCount],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between text-xs tabular-nums">
                      <span className={label}>{k}</span>
                      <span className={cn(k === "Clear setups" && "text-success")}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Link href="/" className={cn(label, "hidden hover:text-foreground lg:block")}>
                About Setup Terminal →
              </Link>
            </aside>

            {/* center */}
            <section aria-label="Setup feed" className="min-w-0">
              <div className="mb-4 flex flex-wrap items-center gap-x-7 gap-y-2 border-b pb-3.5">
                <span className="inline-flex h-10 items-center gap-2.5 rounded-full border border-border-strong bg-card pr-4 pl-1.5">
                  <span className="flex size-7 items-center justify-center rounded-full bg-foreground text-[9px] font-semibold text-background">
                    0G
                  </span>
                  <span className="leading-none">
                    <strong className="block font-sans text-[13px] font-extrabold tracking-[0.02em]">EVIDENCE-FIRST</strong>
                    <span className="text-[9px] tracking-[0.18em] text-muted-foreground uppercase">Post → setup · strip the noise</span>
                  </span>
                </span>
                <span className="text-[13px] tabular-nums">{visible.length} posts</span>
                <span className={cn(label, "ml-auto text-muted-foreground")}>No wallet required</span>
              </div>
              <div className="grid gap-3">
                {visible.map((setup, index) => (
                  <motion.div
                    key={setup.id}
                    layout="position"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <FeedCard
                      setup={setup}
                      selected={selectedId === setup.id}
                      versionId={versionId}
                      onSelect={() => select(setup)}
                      onTrade={(next) => trade(setup, next)}
                      onVersionChange={setVersionId}
                      review={!isXl && selectedId === setup.id ? review : undefined}
                    />
                  </motion.div>
                ))}
                {!visible.length && (
                  <p className={cn(panel, "p-8 text-center text-xs text-subtle")}>No posts match this search.</p>
                )}
              </div>
            </section>

            {/* right */}
            {isXl && (
              <aside className="grid content-start gap-3 xl:sticky xl:top-20 xl:self-start">
                <div className={cn(panel, "p-4")}>{review}</div>
                <div className={cn(panel, "px-4 pt-4 pb-2")}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className={label}>Your orders</span>
                    <button type="button" onClick={() => setTab("orders")} className={cn(label, "hover:text-foreground")}>
                      View all ↗
                    </button>
                  </div>
                  {orders.slice(0, 4).map((o) => (
                    <div key={o.id} className="flex items-center gap-3 border-t py-3 first-of-type:border-0">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full border bg-muted text-[10px]">
                        {o.type === "limit" ? "LMT" : "SWP"}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-sans text-[13px] font-semibold">
                          {o.type === "limit" ? "Buy WETH" : "USDC → WETH"}
                        </span>
                        <span className={label}>
                          Setup {o.setupVersion} · {formatPrice(o.sizeUSDC)} USDC
                        </span>
                      </span>
                      <span className="text-right text-[13px] tabular-nums">
                        {o.type === "limit" ? formatPrice(o.limitUSDCPerWETH!) : formatPrice(o.expectedWETH!, 6)}
                        <span className="block text-[10px] text-success">{o.status}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </aside>
            )}
          </div>
        )}
      </main>

      <Dialog open={sampleOpen} onOpenChange={setSampleOpen}>
        <DialogContent className="rounded-[3px] font-mono sm:max-w-md">
          <DialogHeader>
            <Eyebrow>Demo mode</Eyebrow>
            <DialogTitle className="font-sans text-xl">Try sample post</DialogTitle>
            <DialogDescription className="text-xs leading-relaxed">
              Live analysis will be available when the integration is connected. For now, inspect a bundled X post and
              its extracted setup.
            </DialogDescription>
          </DialogHeader>
          <blockquote className="rounded-[3px] border bg-muted/60 p-4 text-[13px] leading-relaxed">
            “{terminalSetups[0].source}”
          </blockquote>
          <DialogFooter className="flex-col items-stretch gap-3 sm:flex-col">
            <Button
              type="button"
              className="h-10 rounded-[3px] text-[11px] tracking-[0.08em] uppercase"
              onClick={() => {
                setFilter("all");
                setQuery("");
                select(terminalSetups[0]);
                setSampleOpen(false);
              }}
            >
              Load sample post ↗
            </Button>
            <small className="text-center text-[10px] text-subtle">
              Local sample only. No X account or API credentials needed.
            </small>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
