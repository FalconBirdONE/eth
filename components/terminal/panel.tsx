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

/** "● LABEL ━━━━━━━━ value" row, styled after a resolution track. */
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
      <span className="h-[5px] flex-1 rounded-full border bg-muted p-px">
        {filled && (
          <span className="block h-full rounded-full bg-[repeating-linear-gradient(90deg,var(--muted-foreground)_0_2px,transparent_2px_4px)]" />
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
