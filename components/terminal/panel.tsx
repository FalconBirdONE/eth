import type { ReactNode } from "react";

export const panel = "rounded-2xl border bg-card/60 backdrop-blur";
export function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="font-mono text-[11px] tracking-wider text-primary uppercase">{children}</span>;
}
