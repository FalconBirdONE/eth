"use client";
import { useState } from "react";
import { SetupPreview, type EntryMode } from "./setup-preview";
import { RevisionComparison } from "./revision-comparison";
import { ArrowIcon } from "./icons";
import { primaryAction } from "@/lib/example-setup";
export function HomeExperience() {
  const [updated, setUpdated] = useState(false);
  const [mode, setMode] = useState<EntryMode>("custom");
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <div className="hero-eyebrow">
            <span className="blue-dot" />
            From a post to a plan.
          </div>
          <h1>
            Follow the setup.
            <br />
            Choose your entry.
          </h1>
          <p className="hero-description">
            See trade ideas from creators on X as they arrive. Buy now through
            Uniswap, or set a limit order at the creator’s entry or a price you
            choose.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href={primaryAction.href}>
              {primaryAction.label}
              <ArrowIcon />
            </a>
            <a className="text-link" href="#how-it-works">
              See how it works <span aria-hidden="true">↘</span>
            </a>
          </div>
          <div className="hero-note">
            <span className="mini-bracket">[ ]</span>No login. No wallet. Just
            try the example.
          </div>
        </div>
        <div className="terminal-surface">
          <SetupPreview updated={updated} mode={mode} onModeChange={setMode} />
          <RevisionComparison
            updated={updated}
            onToggle={() => setUpdated((value) => !value)}
          />
        </div>
      </section>
    </>
  );
}
