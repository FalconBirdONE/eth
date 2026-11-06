import type { Metadata } from "next";
import { TerminalApp } from "@/components/terminal/terminal-app";
export const metadata: Metadata = {
  title: "Terminal — Setup Terminal",
  description:
    "Inspect creators’ setups, compare revisions, and simulate a trade with local sample data.",
};
export default function TerminalPage() {
  return <TerminalApp />;
}
