import type { SVGProps } from "react";
export function ArrowIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
      {...props}
    >
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}
export function TerminalMark() {
  return (
    <svg
      className="terminal-mark"
      width="30"
      height="30"
      viewBox="0 0 30 30"
      fill="none"
      aria-hidden="true"
    >
      <rect x="1" y="1" width="28" height="28" rx="7" fill="#1E6EF3" />
      <path
        d="m8 10 5 5-5 5m8 0h6"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
export function EthereumMark() {
  return (
    <svg
      width="23"
      height="30"
      viewBox="0 0 24 32"
      fill="none"
      aria-hidden="true"
    >
      <path d="m12 1 10 15-10 6L2 16 12 1Z" fill="currentColor" opacity=".8" />
      <path d="m12 24 10-6-10 13L2 18l10 6Z" fill="currentColor" />
      <path d="M12 1v21l10-6L12 1Z" fill="currentColor" opacity=".4" />
    </svg>
  );
}
