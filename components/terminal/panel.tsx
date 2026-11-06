import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Shared terminal look: white cards, hairline borders, 3px corners, tracked mono labels. */
export const panel = "rounded-[3px] border bg-card";
export const label = "text-[10px] uppercase tracking-[0.18em] text-subtle";
export const chip =
  "inline-flex h-7 items-center rounded-full border px-3 text-[10px] uppercase tracking-[0.12em] text-muted-foreground";
/** Segmented control: black-filled active segment. */
export const segment =
  "px-3 py-1.5 text-[10px] uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:text-foreground aria-pressed:bg-primary aria-pressed:text-primary-foreground";

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn(label, className)}>
      {"// "}
      {children}
    </span>
  );
}

/** "● LABEL ──────● value" row: a hairline leader ending in a node. */
export function Track({
  name,
  filled = true,
  children,
}: {
  name: string;
  filled?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 text-[11px]">
      <span className="flex w-24 shrink-0 items-center gap-1.5 text-[10px] tracking-[0.12em] text-subtle uppercase">
        <span className={cn("size-[7px] rounded-full", filled ? "bg-success" : "bg-border-strong")} />
        {name}
      </span>
      <span className="relative h-px flex-1 bg-border">
        {filled && (
          <span className="absolute inset-y-0 left-0 right-0 bg-foreground/60 after:absolute after:-top-[3px] after:right-0 after:size-[7px] after:rounded-full after:border after:border-foreground after:bg-card" />
        )}
      </span>
      <span className="text-right font-semibold tracking-[0.04em] tabular-nums">{children}</span>
    </div>
  );
}

/** Label-left / value-right row with a hairline separator. */
export function Row({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b py-2 text-xs last:border-0">
      <span className={label}>{name}</span>
      <span className="text-right tabular-nums">{children}</span>
    </div>
  );
}
