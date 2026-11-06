import Link from "next/link";
import { primaryAction } from "@/lib/example-setup";
import { ArrowIcon, TerminalMark } from "./icons";
export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="wordmark" aria-label="Setup Terminal home">
      <TerminalMark />
      <span>
        Setup<span className="wordmark-light"> Terminal</span>
      </span>
    </Link>
  );
}
export function Navbar() {
  return (
    <header className="site-header">
      <nav className="nav-shell" aria-label="Main navigation">
        <Wordmark />
        <div className="desktop-nav">
          <a href="#how-it-works">How it works</a>
          <a href="#example">Example</a>
        </div>
        <a
          className="button button-primary nav-action"
          href={primaryAction.href}
        >
          {primaryAction.label}
          <ArrowIcon />
        </a>
        <details className="mobile-menu">
          <summary aria-label="Navigation menu">
            <span />
            <span />
          </summary>
          <div>
            <a href="#how-it-works">How it works</a>
            <a href="#example">Example</a>
          </div>
        </details>
      </nav>
    </header>
  );
}
