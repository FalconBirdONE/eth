"use client";
import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowDownRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SetupPreview, type EntryMode } from "./setup-preview";
import { RevisionComparison } from "./revision-comparison";
import { ArrowIcon } from "./icons";
import { primaryAction } from "@/lib/example-setup";

const ease = [0.16, 1, 0.3, 1] as const;
const rise = (delay: number) => ({
  initial: { opacity: 0, y: 24, filter: "blur(8px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  transition: { duration: 0.8, delay, ease },
});

export function HomeExperience() {
  const [updated, setUpdated] = useState(false);
  const [mode, setMode] = useState<EntryMode>("custom");
  return (
    <section className="relative grid items-start gap-12 pt-10 pb-20 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14 lg:pt-20">
      <div className="lg:sticky lg:top-32">
        <motion.div {...rise(0)}>
          <span className="inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
            <span className="live-dot" />
            From a post to a plan.
          </span>
        </motion.div>
        <motion.h1
          {...rise(0.08)}
          className="mt-6 text-5xl leading-[1.02] font-semibold tracking-[-0.045em] text-balance sm:text-6xl xl:text-7xl"
        >
          Follow the setup.
          <br />
          <span className="text-gradient">Choose your entry.</span>
        </motion.h1>
        <motion.p {...rise(0.16)} className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
          See trade ideas from creators on X as they arrive. Buy now through Uniswap, or set a limit
          order at the creator’s entry or a price you choose.
        </motion.p>
        <motion.div {...rise(0.24)} className="mt-8 flex flex-wrap items-center gap-3">
          <Button
            asChild
            size="lg"
            className="h-11 rounded-full px-6"
          >
            <Link href={primaryAction.href}>
              {primaryAction.label}
              <ArrowIcon className="size-4 transition-transform group-hover/button:translate-x-0.5" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="lg" className="h-11 rounded-full px-5">
            <a href="#how-it-works">
              See how it works <ArrowDownRight />
            </a>
          </Button>
        </motion.div>
        <motion.p {...rise(0.32)} className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-4 text-primary" />
          No login. No wallet. Just try the example.
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1, delay: 0.2, ease }}
        className="relative min-w-0"
      >
        <div className="overflow-hidden rounded-2xl border bg-card/80 shadow-[0_24px_60px_-30px_oklch(0_0_0/25%)] backdrop-blur-xl">
          <SetupPreview updated={updated} mode={mode} onModeChange={setMode} />
          <RevisionComparison updated={updated} onToggle={() => setUpdated((value) => !value)} />
        </div>
      </motion.div>
    </section>
  );
}
