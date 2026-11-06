"use client";
import { AnimatePresence, motion } from "motion/react";
import { CornerDownRight, Lock, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { exampleSetup as setup, formatPrice } from "@/lib/example-setup";
import { ArrowIcon } from "./icons";
import { PriceRail } from "../shared/price-rail";

export function RevisionComparison({
  updated,
  onToggle,
}: {
  updated: boolean;
  onToggle: () => void;
}) {
  return (
    <section
      className="border-t bg-background/40 px-5 pt-5 pb-4 sm:px-6"
      aria-labelledby="revision-heading"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <span className="mb-1 block text-[10px] tracking-wider text-muted-foreground uppercase">
            Illustrative example
          </span>
          <h2 id="revision-heading" className="text-lg font-semibold tracking-tight">
            An updated idea. Your original order.
          </h2>
        </div>
        <Button
          variant={updated ? "outline" : "secondary"}
          className="h-9 shrink-0 rounded-full border-primary/30 px-3.5 text-xs"
          type="button"
          onClick={onToggle}
          aria-pressed={updated}
          aria-controls="creator-reply revision-caption"
        >
          {updated ? "Reset example" : "Show creator update"}
          {updated ? <RotateCcw /> : <ArrowIcon className="size-4" />}
        </Button>
      </div>

      <div
        className={cn(
          "mt-3 flex min-h-14 items-center border-l-2 py-2 pl-3 transition-colors duration-300",
          updated ? "border-violet" : "border-border",
        )}
        id="creator-reply"
        aria-live="polite"
        aria-atomic="true"
      >
        <AnimatePresence mode="wait" initial={false}>
          {updated ? (
            <motion.div
              key="reply"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="flex items-center gap-2.5"
            >
              <CornerDownRight className="size-4 text-violet" aria-hidden="true" />
              <div>
                <span className="text-[10px] text-muted-foreground">{setup.creator} replied</span>
                <p className="text-sm">“{setup.creatorReply}”</p>
              </div>
            </motion.div>
          ) : (
            <motion.p
              key="prompt"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="text-xs leading-relaxed text-muted-foreground"
            >
              What if the creator changes their entry?
              <span className="block text-[10px]">Try the update to compare.</span>
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <PriceRail updated={updated} />

      <div className="border-t pt-3">
        <div className="flex items-start gap-3" id="revision-caption" aria-live="polite" aria-atomic="true">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
            <Lock className="size-3.5" />
          </span>
          <div className="grid">
            {[false, true].map((revised) => (
              <div
                key={String(revised)}
                className={cn(
                  "[grid-area:1/1] transition-all duration-300",
                  updated === revised ? "opacity-100" : "invisible translate-y-1 opacity-0",
                )}
                aria-hidden={updated !== revised}
              >
                <strong className="block text-xs font-medium leading-normal">
                  {revised
                    ? "The creator changed their entry. Your example order kept its price."
                    : "Your signed order belongs to you."}
                </strong>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  {revised ? (
                    <>
                      Creator’s entry moved from{" "}
                      <b className="font-medium text-foreground">${formatPrice(setup.originalEntry)}</b> to{" "}
                      <b className="font-medium text-foreground">${formatPrice(setup.revisedEntry)}</b>.{" "}
                    </>
                  ) : (
                    <>The creator can revise their idea. Your signed terms stay yours. </>
                  )}
                  Your example limit order stays open at{" "}
                  <b className="font-medium text-primary">
                    {formatPrice(setup.followerPrice)} {setup.quoteAsset} per {setup.orderAsset}
                  </b>
                  .
                </p>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          Illustrative entry levels. Not a live chart or currency conversion.
        </p>
      </div>
    </section>
  );
}
