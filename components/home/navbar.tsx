"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { primaryAction } from "@/lib/example-setup";
import { ArrowIcon, TerminalMark } from "./icons";

export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2.5 text-lg font-semibold tracking-tight whitespace-nowrap"
      aria-label="Setup Terminal home"
    >
      <TerminalMark />
      <span>
        Setup<span className="font-normal text-muted-foreground"> Terminal</span>
      </span>
    </Link>
  );
}

const links = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#example", label: "Example" },
  { href: "#powers", label: "Stack" },
  { href: "#faq", label: "FAQ" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-transparent transition-all duration-300",
        (scrolled || open) && "border-border bg-background/70 backdrop-blur-xl",
      )}
    >
      <nav
        className="mx-auto flex h-18 w-full max-w-7xl items-center justify-between gap-6 px-4 sm:px-8"
        aria-label="Main navigation"
      >
        <Wordmark />
        <div className="hidden items-center gap-1 rounded-full border bg-card/50 p-1 text-sm md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-full px-4 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="lg" className="rounded-full px-4">
            <Link href={primaryAction.href}>
              {primaryAction.label}
              <ArrowIcon className="hidden size-4 sm:block" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon-lg"
            className="md:hidden"
            aria-label="Navigation menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X /> : <Menu />}
          </Button>
        </div>
      </nav>
      {open && (
        <div className="animate-in fade-in slide-in-from-top-2 border-t px-4 pb-4 md:hidden">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block border-b py-3.5 text-sm text-muted-foreground last:border-0 hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </div>
      )}
    </header>
  );
}
