"use client";
import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { toast } from "sonner";
import { ArrowLeft, ArrowUpRight, Plus, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
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
import { ArrowIcon, EthereumMark } from "../home/icons";
import { formatPrice } from "@/lib/example-setup";
import { terminalSetups, type TradeSetup } from "@/lib/terminal-data";
import { useDemoOrders } from "@/lib/demo-orders";
import type { TradeReviewRequest } from "@/lib/trade-provider";
import { SetupDetail } from "./setup-detail";
import { OrdersPanel } from "./orders-panel";

export function TerminalApp() {
  const [tab, setTab] = useState<"feed" | "orders">("feed");
  const [selectedId, setSelectedId] = useState("eth-buy");
  const [versionId, setVersionId] = useState<"v1" | "v2">("v2");
  const [showDetail, setShowDetail] = useState(false);
  const [sampleOpen, setSampleOpen] = useState(false);
  const { orders, createdCount, save, reset } = useDemoOrders();
  const selected = terminalSetups.find((setup) => setup.id === selectedId) ?? terminalSetups[0];

  function select(setup: TradeSetup) {
    setSelectedId(setup.id);
    setVersionId("v2");
    setShowDetail(true);
    setTab("feed");
    toast.dismiss();
    requestAnimationFrame(() => document.getElementById("selected-setup-title")?.focus());
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
  const goFeed = () => {
    setTab("feed");
    setShowDetail(false);
  };

  return (
    <div className="relative isolate min-h-screen">
      <div aria-hidden="true" className="bg-grid pointer-events-none absolute inset-x-0 top-0 -z-10 h-[600px]" />
      <a
        className="sr-only z-[60] rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        href="#terminal-main"
      >
        Skip to terminal
      </a>
      <header className="relative z-40 border-b sm:sticky sm:top-0 bg-background/75 backdrop-blur-xl">
        <nav
          className="mx-auto flex max-w-[1560px] flex-wrap items-center gap-x-8 gap-y-2 px-4 py-3 sm:px-6"
          aria-label="Terminal navigation"
        >
          <Wordmark />
          <div
            className="order-last flex w-full gap-1 rounded-full border bg-card/60 p-1 sm:order-none sm:w-auto"
            role="group"
            aria-label="Terminal view"
          >
            {(
              [
                ["feed", "Feed"],
                ["orders", "My Orders"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={tab === id}
                onClick={() => (id === "feed" ? goFeed() : setTab("orders"))}
                className="relative isolate flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground aria-pressed:text-primary-foreground sm:flex-none"
              >
                {tab === id && (
                  <motion.span
                    layoutId="terminal-tab"
                    className="absolute inset-0 -z-10 rounded-full bg-primary"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                  />
                )}
                {label}
                {id === "orders" && (
                  <span className="rounded-full bg-foreground/10 px-1.5 font-mono text-[10px] tabular-nums">
                    {orders.length}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Badge variant="outline" className="gap-1.5 text-primary">
              <span className="live-dot" />
              Demo mode
            </Badge>
            <Button variant="ghost" size="sm" type="button" onClick={resetDemo} disabled={!createdCount}>
              <RotateCcw />
              Reset demo
            </Button>
          </div>
        </nav>
      </header>
      <div className="flex justify-between gap-4 border-b bg-primary/5 px-4 py-2 text-[11px] text-muted-foreground sm:px-6">
        <span>Sample data. All quotes and orders are illustrative.</span>
        <span className="hidden items-center gap-1 sm:flex">
          No wallet required <ArrowUpRight className="size-3" aria-hidden="true" />
        </span>
      </div>

      <main id="terminal-main" className="mx-auto max-w-[1560px] px-4 py-6 sm:px-6 lg:py-8">
        {tab === "orders" ? (
          <OrdersPanel orders={orders} onFeed={goFeed} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
            <aside
              className={cn("lg:sticky lg:top-28 lg:self-start", showDetail && "hidden lg:block")}
              aria-labelledby="feed-heading"
            >
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <span className="font-mono text-[11px] tracking-wider text-primary uppercase">
                    From post to setup
                  </span>
                  <h1 id="feed-heading" tabIndex={-1} className="mt-1 text-2xl font-semibold tracking-tight outline-none">
                    Setup feed <span className="font-mono text-sm text-muted-foreground">03</span>
                  </h1>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  className="rounded-full"
                  onClick={() => setSampleOpen(true)}
                  aria-haspopup="dialog"
                >
                  <Plus />
                  Analyze X Post
                </Button>
              </div>
              <div className="mb-3 flex justify-between text-[11px] text-muted-foreground">
                <span>Sample data</span>
                <span>3 posts · 1 clear setup</span>
              </div>
              <div className="grid gap-3">
                {terminalSetups.map((setup, index) => (
                  <motion.div
                    key={setup.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.07, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <FeedRow setup={setup} selected={selectedId === setup.id} onSelect={() => select(setup)} />
                  </motion.div>
                ))}
              </div>
              <div className="mt-5 flex gap-3 rounded-xl border border-dashed p-4 text-xs leading-relaxed text-muted-foreground">
                <span className="live-dot mt-1.5" />
                <p>
                  A clear entry becomes a setup.
                  <br />
                  Your signature sets the terms.
                </p>
              </div>
              <Link
                className="mt-4 flex items-center justify-between rounded-xl px-1 py-2 text-xs text-muted-foreground transition-colors hover:text-primary"
                href="/"
              >
                About Setup Terminal <ArrowIcon className="size-4" />
              </Link>
            </aside>
            <section className={cn(!showDetail && "hidden lg:block")} aria-label="Selected setup detail">
              <Button
                variant="ghost"
                size="sm"
                className="mb-3 lg:hidden"
                type="button"
                onClick={() => {
                  setShowDetail(false);
                  requestAnimationFrame(() => document.getElementById("feed-heading")?.focus());
                }}
              >
                <ArrowLeft /> Back to feed
              </Button>
              <SetupDetail
                setup={selected}
                versionId={versionId}
                onVersionChange={setVersionId}
                onSave={saveReview}
              />
            </section>
          </div>
        )}
      </main>

      <Dialog open={sampleOpen} onOpenChange={setSampleOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <Badge variant="outline" className="mb-2 text-primary">
              Demo mode
            </Badge>
            <DialogTitle className="text-xl">Try sample post</DialogTitle>
            <DialogDescription>
              Live analysis will be available when the integration is connected. For now, inspect a bundled X
              post and its extracted setup.
            </DialogDescription>
          </DialogHeader>
          <blockquote className="rounded-xl border-l-2 border-primary bg-muted/50 p-4 text-sm leading-relaxed">
            “{terminalSetups[0].source}”
          </blockquote>
          <DialogFooter className="flex-col items-stretch gap-3 sm:flex-col">
            <Button
              size="lg"
              type="button"
              onClick={() => {
                select(terminalSetups[0]);
                setSampleOpen(false);
              }}
            >
              Load sample post
              <ArrowIcon className="size-4" />
            </Button>
            <small className="text-center text-[11px] text-muted-foreground">
              Local sample only. No X account or API credentials needed.
            </small>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FeedRow({
  setup,
  selected,
  onSelect,
}: {
  setup: TradeSetup;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "group w-full rounded-2xl border bg-card/50 p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-foreground/20 hover:bg-card",
        selected && "border-primary/50 bg-card shadow-[0_0_0_1px_var(--primary),0_10px_40px_-12px_oklch(0.9_0.19_125/35%)]",
      )}
    >
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span className="flex size-5 items-center justify-center rounded-full bg-gradient-to-br from-violet to-primary text-[9px] font-semibold text-primary-foreground">
          D
        </span>
        <span>{setup.creator}</span>
        <small className="ml-auto">{setup.timestamp}</small>
      </div>
      <div className="mt-3 flex items-center gap-2 [&_svg]:h-4 [&_svg]:w-3 [&_svg]:text-muted-foreground">
        <EthereumMark />
        <strong className="text-sm font-semibold">{setup.title}</strong>
        <ArrowUpRight
          className="ml-auto size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary"
          aria-hidden="true"
        />
      </div>
      <div className="mt-2 flex items-baseline gap-2 tabular-nums">
        {setup.kind === "actionable" ? (
          <>
            <strong className="text-lg font-semibold text-primary">
              ${formatPrice(setup.versions[1].entryUSD)}
            </strong>
            <s className="text-xs text-muted-foreground">${formatPrice(setup.versions[0].entryUSD)}</s>
            <span className="text-[11px] text-muted-foreground">USD · buy entry</span>
          </>
        ) : (
          <span className="text-sm text-muted-foreground italic">{setup.status}</span>
        )}
      </div>
      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{setup.source}</p>
      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
        <Badge
          variant={setup.kind === "actionable" ? "default" : "secondary"}
          className={setup.kind === "actionable" ? "bg-primary/15 text-primary" : ""}
        >
          {setup.kind === "actionable" ? "Updated" : "Inspect source"}
        </Badge>
        <span>{setup.kind === "actionable" ? "Setup v2" : "No trade entry"}</span>
      </div>
    </button>
  );
}
