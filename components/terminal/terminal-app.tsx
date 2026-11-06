"use client";
import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { toast } from "sonner";
import { ArrowRight, Search } from "lucide-react";
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
import { Eyebrow, label, panel } from "./panel";

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

const clearCount = terminalSetups.filter((s) => s.kind === "actionable").length;

export function TerminalApp() {
  const [tab, setTab] = useState<"feed" | "orders">("feed");
  const [selectedId, setSelectedId] = useState("eth-buy");
  const [versionId, setVersionId] = useState<"v1" | "v2">("v2");
  const [mode, setMode] = useState<Mode>("copy");
  const [filter, setFilter] = useState<"all" | "setups">("all");
  const [sampleOpen, setSampleOpen] = useState(false);
  const isXl = useIsXl();
  const { orders, createdCount, save, reset } = useDemoOrders();
  const selected = terminalSetups.find((setup) => setup.id === selectedId) ?? terminalSetups[0];
  const visible = filter === "all" ? terminalSetups : terminalSetups.filter((s) => s.kind === "actionable");

  function select(setup: TradeSetup) {
    if (setup.id !== selectedId) setVersionId("v2");
    setSelectedId(setup.id);
    setTab("feed");
  }
  function trade(setup: TradeSetup, next: Mode) {
    select(setup);
    setMode(next);
    setTimeout(() => document.getElementById("trade-review")?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 350);
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

  const actionableVersion =
    selected.kind === "actionable" ? (selected.versions.find((v) => v.id === versionId) ?? selected.versions[1]) : null;
  const review = actionableVersion ? (
    <TradeReview
      setupId={selected.id}
      version={actionableVersion}
      mode={mode}
      onModeChange={setMode}
      onSave={saveReview}
    />
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
    <div className="relative isolate min-h-screen font-mono">
      <div
        aria-hidden="true"
        className="bg-halftone pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] [mask-image:radial-gradient(ellipse_60%_70%_at_50%_0%,black,transparent)]"
      />
      <a
        className="sr-only z-[60] rounded-sm bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        href="#terminal-main"
      >
        Skip to terminal
      </a>

      <header className="relative z-40 border-b bg-background/80 backdrop-blur-xl sm:sticky sm:top-0">
        <nav className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-x-8 gap-y-1 px-4 py-3 sm:px-6" aria-label="Terminal navigation">
          <span className="font-sans">
            <Wordmark />
          </span>
          <div className="order-last flex w-full gap-6 sm:order-none sm:w-auto" role="group" aria-label="Terminal view">
            {(
              [
                ["feed", "Terminal"],
                ["orders", "My Orders"],
              ] as const
            ).map(([id, text]) => (
              <button
                key={id}
                type="button"
                aria-pressed={tab === id}
                onClick={() => setTab(id)}
                className="relative py-2 text-[11px] tracking-[0.2em] text-muted-foreground uppercase transition-colors hover:text-foreground aria-pressed:text-foreground"
              >
                {text}
                {id === "orders" && <span className="ml-1.5 text-primary">{orders.length}</span>}
                {tab === id && (
                  <motion.span layoutId="terminal-tab" className="absolute inset-x-0 -bottom-[13px] h-0.5 bg-primary" />
                )}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex overflow-hidden rounded-sm border text-[10px] tracking-[0.18em] uppercase">
              <span className="flex items-center gap-1.5 bg-primary px-2.5 py-1.5 font-semibold text-primary-foreground">
                Demo
              </span>
              <span className="px-2.5 py-1.5 text-muted-foreground/60" title="Live trading is not connected">
                Live
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              type="button"
              onClick={resetDemo}
              disabled={!createdCount}
              className="rounded-sm text-[10px] tracking-[0.18em] uppercase"
            >
              Reset demo
            </Button>
          </div>
        </nav>
      </header>

      <main id="terminal-main" className="mx-auto max-w-[1400px] px-4 pb-16 sm:px-6">
        {/* analyze bar */}
        <div className="mx-auto max-w-2xl py-10 text-center sm:py-14">
          <Eyebrow>Analyze an X post</Eyebrow>
          <button
            type="button"
            onClick={() => setSampleOpen(true)}
            aria-haspopup="dialog"
            className="group mt-4 flex w-full items-center gap-3 rounded-full border bg-card/80 px-5 py-4 text-left font-sans text-sm text-muted-foreground shadow-lg backdrop-blur transition-all hover:border-primary/50 hover:shadow-[0_0_40px_-15px_var(--primary)]"
          >
            <Search className="size-4" />
            Paste a post link — or try the sample
            <span className="ml-auto flex items-center gap-1 font-mono text-[10px] tracking-[0.18em] text-primary uppercase">
              Analyze <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
            </span>
          </button>
        </div>

        {tab === "orders" ? (
          <OrdersPanel orders={orders} onFeed={() => setTab("feed")} />
        ) : (
          <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_340px]">
            {/* left rail */}
            <aside className="grid content-start gap-6 lg:sticky lg:top-24 lg:self-start" aria-labelledby="feed-heading">
              <div>
                <Eyebrow>Live feed</Eyebrow>
                <h1 id="feed-heading" className="mt-1 font-sans text-3xl font-bold tracking-tight">
                  Terminal
                </h1>
                <p className={cn(label, "mt-2 flex items-center gap-2")}>
                  <span className="live-dot" /> Demo · sample data
                </p>
              </div>
              <div>
                <p className={cn(label, "mb-2")}>Filter</p>
                <div className="grid grid-cols-2 gap-2 lg:grid-cols-1" role="group" aria-label="Filter feed">
                  {(
                    [
                      ["all", "All posts"],
                      ["setups", "Clear setups only"],
                    ] as const
                  ).map(([id, text]) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={filter === id}
                      onClick={() => setFilter(id)}
                      className="rounded-sm border px-3 py-2.5 text-left text-xs transition-colors hover:border-foreground/30 aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                    >
                      {text}
                    </button>
                  ))}
                </div>
              </div>
              <div className={cn(panel, "hidden overflow-hidden lg:block")}>
                <div className="flex h-20 items-center justify-center gap-1 bg-black px-3" aria-hidden="true">
                  {Array.from({ length: 22 }, (_, i) => (
                    <span
                      key={i}
                      className="bg-halftone h-full w-1.5 [background-size:4px_4px] [background-image:radial-gradient(circle,oklch(0.9_0.19_125/70%)_1px,transparent_1.3px)]"
                      style={{ animation: `wave ${1.4 + (i % 5) * 0.2}s ease-in-out ${i * 0.07}s infinite` }}
                    />
                  ))}
                </div>
                <div className="grid gap-2 p-3">
                  <p className={cn(label, "mb-1 text-foreground")}>Signal integrity</p>
                  {[
                    ["Posts indexed", terminalSetups.length],
                    ["Clear setups", clearCount],
                    ["Needs review", terminalSetups.length - clearCount],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between text-xs">
                      <span className={label}>{k}</span>
                      <span className={cn("tabular-nums", k === "Clear setups" && "text-primary")}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="hidden text-[11px] leading-relaxed text-muted-foreground lg:block">
                A clear entry becomes a setup.
                <br />
                Your signature sets the terms.
              </p>
              <Link
                href="/"
                className={cn(label, "hidden items-center justify-between hover:text-primary lg:flex")}
              >
                About Setup Terminal <ArrowRight className="size-3" />
              </Link>
            </aside>

            {/* feed */}
            <section aria-label="Setup feed" className="min-w-0">
              <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-b pb-4">
                <span className="inline-flex items-center gap-3 rounded-full border bg-card/70 py-1.5 pr-4 pl-1.5">
                  <span className="flex size-7 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    0G
                  </span>
                  <span className="leading-tight">
                    <strong className="block font-sans text-xs">Post → Setup</strong>
                    <span className="text-[9px] tracking-[0.18em] text-muted-foreground uppercase">
                      Evidence first · strip the noise
                    </span>
                  </span>
                </span>
                <span className="text-sm">
                  {visible.length} posts · {clearCount} clear setup
                </span>
                <span className={cn(label, "ml-auto hidden sm:block")}>No wallet required</span>
              </div>
              <div className="grid gap-4">
                {visible.map((setup, index) => (
                  <motion.div
                    key={setup.id}
                    layout
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
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
              </div>
            </section>

            {/* right rail */}
            {isXl && (
              <aside className="grid content-start gap-4 xl:sticky xl:top-24 xl:self-start">
                <div className={cn(panel, "relative overflow-hidden p-5 shadow-[0_20px_60px_-30px_var(--primary)]")}>
                  <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
                  {review}
                </div>
                <div className={cn(panel, "p-5")}>
                  <div className="mb-3 flex items-center justify-between">
                    <span className={label}>Your orders</span>
                    <button type="button" onClick={() => setTab("orders")} className={cn(label, "text-primary hover:underline")}>
                      View all →
                    </button>
                  </div>
                  {orders.slice(0, 3).map((o) => (
                    <div key={o.id} className="flex items-center justify-between border-t py-2.5 text-xs first:border-0">
                      <span>
                        <span className="block">{o.type === "limit" ? "Buy WETH" : "USDC → WETH"}</span>
                        <span className="text-[10px] text-muted-foreground">
                          Setup {o.setupVersion} · {formatPrice(o.sizeUSDC)} USDC
                        </span>
                      </span>
                      <span className="text-right tabular-nums">
                        <span className="block text-primary">
                          {o.type === "limit" ? formatPrice(o.limitUSDCPerWETH!) : formatPrice(o.expectedWETH!, 6)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{o.status}</span>
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
        <DialogContent className="rounded-sm font-mono sm:max-w-md">
          <DialogHeader>
            <Eyebrow className="text-primary">Demo mode</Eyebrow>
            <DialogTitle className="font-sans text-xl">Try sample post</DialogTitle>
            <DialogDescription className="text-xs leading-relaxed">
              Live analysis will be available when the integration is connected. For now, inspect a bundled X post and
              its extracted setup.
            </DialogDescription>
          </DialogHeader>
          <blockquote className="rounded-sm border-l-2 border-primary bg-muted/50 p-4 text-sm leading-relaxed">
            “{terminalSetups[0].source}”
          </blockquote>
          <DialogFooter className="flex-col items-stretch gap-3 sm:flex-col">
            <Button
              size="lg"
              type="button"
              className="rounded-full text-[11px] tracking-[0.16em] uppercase"
              onClick={() => {
                setFilter("all");
                select(terminalSetups[0]);
                setSampleOpen(false);
              }}
            >
              Load sample post <ArrowRight />
            </Button>
            <small className="text-center text-[10px] text-muted-foreground">
              Local sample only. No X account or API credentials needed.
            </small>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
