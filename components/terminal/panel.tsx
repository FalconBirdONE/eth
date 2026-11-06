import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const panel = "rounded-sm border bg-card/70 backdrop-blur";
export const label = "text-[10px] uppercase tracking-[0.2em] text-muted-foreground";
export const chip =
  "inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-[10px] uppercase tracking-[0.14em]";

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn(label, className)}>{"// "}{children}</span>;
}

/** "LABEL ········ value" row. */
export function Leader({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className={cn(label, "flex items-center gap-1.5")}>
        <span className="size-1.5 rounded-full bg-primary" />
        {name}
      </span>
      <span className="h-0 flex-1 border-t-2 border-dotted border-foreground/20" />
      <span className="text-right font-semibold tabular-nums">{children}</span>
    </div>
  );
}
