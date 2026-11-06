"use client";
import { useRef, useState } from "react";
import Link from "next/link";
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
  const [notice, setNotice] = useState("");
  const [saveError, setSaveError] = useState("");
  const sampleDialog = useRef<HTMLDialogElement>(null);
  const { orders, createdCount, save, reset } = useDemoOrders();
  const selected =
    terminalSetups.find((setup) => setup.id === selectedId) ??
    terminalSetups[0];
  function select(setup: TradeSetup) {
    setSelectedId(setup.id);
    setVersionId("v2");
    setShowDetail(true);
    setTab("feed");
    setNotice("");
    setSaveError("");
    requestAnimationFrame(() =>
      document.getElementById("selected-setup-title")?.focus(),
    );
  }
  function saveReview(request: TradeReviewRequest) {
    try {
      save(request);
      setSaveError("");
      setNotice(
        request.type === "limit"
          ? `Limit order simulated at ${formatPrice(request.limitUSDCPerWETH)} USDC per WETH · Setup ${request.setupVersion}.`
          : "Swap simulated. The illustrative result is saved in My Orders.",
      );
    } catch {
      setSaveError(
        "Your browser could not save this simulation. Enable local storage and try again.",
      );
    }
  }
  function resetDemo() {
    try {
      reset();
      setNotice(
        "Demo reset. Your simulations were cleared; the bundled example remains.",
      );
      setSaveError("");
    } catch {
      setSaveError(
        "Demo storage could not be cleared. Check your browser storage settings.",
      );
    }
  }
  return (
    <div className={`terminal-app ${showDetail ? "has-detail" : ""}`}>
      <a className="skip-link" href="#terminal-main">
        Skip to terminal
      </a>
      <header className="terminal-header">
        <nav aria-label="Terminal navigation">
          <Wordmark />
          <div className="app-tabs" role="group" aria-label="Terminal view">
            <button
              type="button"
              aria-pressed={tab === "feed"}
              onClick={() => {
                setTab("feed");
                setShowDetail(false);
              }}
            >
              Feed
            </button>
            <button
              type="button"
              aria-pressed={tab === "orders"}
              onClick={() => setTab("orders")}
            >
              My Orders<span>{orders.length}</span>
            </button>
          </div>
          <div className="app-header-actions">
            <span className="demo-badge">
              <span className="blue-dot" />
              Demo mode
            </span>
            <button
              className="reset-demo"
              type="button"
              onClick={resetDemo}
              disabled={!createdCount}
            >
              Reset demo
            </button>
          </div>
        </nav>
      </header>
      <div className="demo-banner">
        <span>Sample data. All quotes and orders are illustrative.</span>
        <span>
          No wallet required <span aria-hidden="true">↗</span>
        </span>
      </div>
      <main id="terminal-main" className="terminal-main">
        {notice && (
          <div className="terminal-notice" role="status">
            <span>{notice}</span>
            <button onClick={() => setTab("orders")} type="button">
              View My Orders <ArrowIcon />
            </button>
            <button
              className="dismiss-notice"
              aria-label="Dismiss notification"
              type="button"
              onClick={() => setNotice("")}
            >
              ×
            </button>
          </div>
        )}
        {saveError && (
          <p className="terminal-error" role="alert">
            {saveError}
          </p>
        )}
        {tab === "orders" ? (
          <OrdersPanel
            orders={orders}
            onFeed={() => {
              setTab("feed");
              setShowDetail(false);
            }}
          />
        ) : (
          <div className="terminal-workspace">
            <aside className="feed-pane" aria-labelledby="feed-heading">
              <div className="feed-heading">
                <div>
                  <span className="t-eyebrow">From post to setup</span>
                  <h1 id="feed-heading" tabIndex={-1}>
                    Setup feed <span>03</span>
                  </h1>
                </div>
                <button
                  className="analyze-button"
                  type="button"
                  onClick={() => sampleDialog.current?.showModal()}
                  aria-haspopup="dialog"
                >
                  <span aria-hidden="true">＋</span>Analyze X Post
                </button>
              </div>
              <div className="feed-label">
                <span>Sample data</span>
                <span>3 posts · 1 clear setup</span>
              </div>
              <div className="feed-items">
                {terminalSetups.map((setup) => (
                  <FeedRow
                    key={setup.id}
                    setup={setup}
                    selected={selectedId === setup.id}
                    onSelect={() => select(setup)}
                  />
                ))}
              </div>
              <div className="feed-footnote">
                <span className="blue-dot" />
                <p>
                  A clear entry becomes a setup.
                  <br />
                  Your signature sets the terms.
                </p>
              </div>
              <Link className="terminal-home-link" href="/">
                About Setup Terminal <ArrowIcon />
              </Link>
            </aside>
            <section className="detail-pane" aria-label="Selected setup detail">
              <button
                className="back-feed"
                type="button"
                onClick={() => {
                  setShowDetail(false);
                  requestAnimationFrame(() =>
                    document.getElementById("feed-heading")?.focus(),
                  );
                }}
              >
                ← Back to feed
              </button>
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
      <dialog
        className="sample-dialog"
        ref={sampleDialog}
        aria-labelledby="sample-dialog-heading"
      >
        <div className="dialog-heading">
          <span className="t-badge badge-blue">Demo mode</span>
          <button
            type="button"
            className="dialog-close"
            aria-label="Close sample dialog"
            onClick={() => sampleDialog.current?.close()}
          >
            ×
          </button>
        </div>
        <h2 id="sample-dialog-heading">Try sample post</h2>
        <p>
          Live analysis will be available when the integration is connected. For
          now, inspect a bundled X post and its extracted setup.
        </p>
        <blockquote>“{terminalSetups[0].source}”</blockquote>
        <button
          className="button terminal-primary"
          type="button"
          onClick={() => {
            select(terminalSetups[0]);
            sampleDialog.current?.close();
          }}
        >
          Load sample post
          <ArrowIcon />
        </button>
        <small>
          Local sample only. No X account or API credentials needed.
        </small>
      </dialog>
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
      className={`feed-row ${selected ? "is-selected" : ""}`}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <div className="feed-row-top">
        <span className="feed-avatar">D</span>
        <span>{setup.creator}</span>
        <small>{setup.timestamp}</small>
      </div>
      <div className="feed-row-title">
        <EthereumMark />
        <strong>{setup.title}</strong>
        <span aria-hidden="true">↗</span>
      </div>
      <div className="feed-entry">
        {setup.kind === "actionable" ? (
          <>
            <strong>${formatPrice(setup.versions[1].entryUSD)}</strong>
            <s>${formatPrice(setup.versions[0].entryUSD)}</s>
            <span>USD · buy entry</span>
          </>
        ) : (
          <span className="unconfirmed-entry">{setup.status}</span>
        )}
      </div>
      <p>{setup.source}</p>
      <div className="feed-row-bottom">
        <span
          className={`t-badge ${setup.kind === "actionable" ? "badge-blue" : "badge-neutral"}`}
        >
          {setup.kind === "actionable" ? "Updated" : "Inspect source"}
        </span>
        <span>
          {setup.kind === "actionable" ? "Setup v2" : "No trade entry"}
        </span>
      </div>
    </button>
  );
}
