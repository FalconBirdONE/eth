import Link from "next/link";
import Image from "next/image";
import { Layers, PenLine, ShieldCheck } from "lucide-react";
import { Navbar, Wordmark } from "@/components/home/navbar";
import { HomeExperience } from "@/components/home/home-experience";
import { ArrowIcon } from "@/components/home/icons";
import { EthCrystal } from "@/components/home/eth-crystal";
import { Reveal } from "@/components/motion";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { primaryAction } from "@/lib/example-setup";

const steps = [
  {
    title: "See the setup.",
    text: "We follow selected creators on X. When a post gives a clear entry, the terminal shows the level and the words behind it.",
    detail: "X post → Structured setup",
  },
  {
    title: "Choose how to enter.",
    text: "Get a Uniswap quote to buy now, or review a Flash limit order at the creator’s entry or a price you choose.",
    detail: "Creator’s price → Your decision",
  },
  {
    title: "See what changed.",
    text: "When a creator revises a setup, compare the update with the order you already signed.",
    detail: "Updated idea → Same signed order",
  },
];

const powers = [
  {
    logo: "/logos/0g.jpg",
    role: "Inference",
    title: "0G Private Computer",
    text: "Interprets posts and replies and surfaces the evidence behind each extracted term.",
  },
  { logo: "/logos/uniswap.png", role: "Buy now", title: "Uniswap", text: "Quotes and executes Buy Now swaps." },
  {
    logo: "/logos/definitive.png",
    role: "Limit orders",
    title: "Definitive Flash",
    text: "Places and tracks the limit orders followers sign.",
  },
];

const ethFacts = [
  {
    icon: Layers,
    title: "Settles on Base",
    text: "Orders live on Ethereum’s L2: WETH against USDC, with fees measured in cents.",
  },
  {
    icon: PenLine,
    title: "You sign every order",
    text: "A creator’s post never trades for you. Nothing is placed until you review and sign it.",
  },
  {
    icon: ShieldCheck,
    title: "Your terms stay yours",
    text: "When a creator moves their entry, your signed order doesn’t move with it.",
  },
];

const faqs = [
  {
    q: "Does copying a setup place a trade automatically?",
    a: "Copying prefills the order review. You choose your size and confirm the terms before signing.",
  },
  {
    q: "What happens when a creator changes their entry?",
    a: "The terminal shows the revision next to the order you already signed, so you can decide whether to update it. Your order never changes on its own.",
  },
  {
    q: "How do you turn a post into a setup?",
    a: "0G Private Computer reads the post and its replies, extracts the asset, entry and target, and highlights the exact words each term came from.",
  },
  {
    q: "Which network does it use?",
    a: "Base, Ethereum’s L2. Buy Now routes through Uniswap; limit orders are placed and tracked with Definitive Flash.",
  },
  {
    q: "Is the demo trading real funds?",
    a: "No. The example runs on illustrative local data with no wallet and no live quotes, so you can explore the flow safely.",
  },
];

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-4 inline-flex items-center gap-2 font-mono text-xs tracking-wider text-primary uppercase">
      <span className="h-px w-6 bg-primary" />
      {children}
    </span>
  );
}

export default function Home() {
  return (
    <div className="relative isolate overflow-x-clip">
      <div aria-hidden="true" className="bg-grid pointer-events-none absolute inset-x-0 top-0 -z-10 h-[900px]" />
      <a
        className="sr-only z-[60] rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        href="#main"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main" className="mx-auto w-full max-w-7xl px-4 sm:px-8">
        <HomeExperience />

        <section id="ethereum" className="border-t py-24" aria-labelledby="ethereum-heading">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-14">
            <Reveal>
              <EthCrystal />
            </Reveal>
            <div>
              <Reveal>
                <Kicker>Ethereum-native</Kicker>
                <h2 id="ethereum-heading" className="text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl">
                  Alpha lives on X.
                  <br />
                  <span className="text-muted-foreground">Execution lives onchain.</span>
                </h2>
                <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground">
                  Trade ideas spread as posts, screenshots and replies, and the entry is gone before you
                  can act. Setup Terminal turns them into orders you can read, check and sign on Ethereum.
                </p>
              </Reveal>
              <div className="mt-8 grid gap-3">
                {ethFacts.map(({ icon: Icon, title, text }, index) => (
                  <Reveal key={title} delay={0.1 + index * 0.08}>
                    <div className="flex gap-4 rounded-2xl border bg-card/50 p-5 transition-colors hover:border-primary/40 hover:bg-card">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-background">
                        <Icon className="size-4" />
                      </span>
                      <div>
                        <h3 className="font-semibold tracking-tight">{title}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{text}</p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="border-t py-24">
          <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
            <Reveal>
              <Kicker>How it works</Kicker>
              <h2 className="text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl">
                Conviction is theirs.
                <br />
                <span className="text-muted-foreground">The decision is yours.</span>
              </h2>
            </Reveal>
            <div className="grid gap-4">
              {steps.map((step, index) => (
                <Reveal key={step.title} delay={index * 0.1}>
                  <article className="group relative grid gap-x-6 gap-y-2 overflow-hidden rounded-2xl border bg-card/50 p-6 transition-colors duration-300 hover:border-primary/40 hover:bg-card sm:grid-cols-[3rem_1fr]">
                    <span className="font-mono text-sm text-primary">0{index + 1}</span>
                    <div>
                      <h3 className="text-xl font-semibold tracking-tight">{step.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
                      <span className="mt-4 inline-block rounded-full border bg-background/60 px-3 py-1 font-mono text-[11px] text-muted-foreground transition-colors group-hover:border-primary/30 group-hover:text-primary">
                        {step.detail}
                      </span>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section id="powers" className="border-t py-24" aria-labelledby="powers-heading">
          <Reveal className="mb-12 max-w-xl">
            <Kicker>Under the hood</Kicker>
            <h2 id="powers-heading" className="text-4xl font-semibold tracking-tight sm:text-5xl">
              What powers the terminal
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              One protocol reads the idea, two execute it. Each does the part it’s best at.
            </p>
          </Reveal>
          <div className="grid gap-4 md:grid-cols-3">
            {powers.map(({ logo, role, title, text }, index) => (
              <Reveal key={title} delay={index * 0.1} className="h-full">
                <div className="group relative h-full overflow-hidden rounded-2xl border bg-card/50 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40">
                  <div
                    aria-hidden="true"
                    className="absolute -top-20 -right-20 size-40 rounded-full bg-foreground/5 opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100"
                  />
                  <div className="flex items-center justify-between">
                    <Image
                      src={logo}
                      alt={`${title} logo`}
                      width={48}
                      height={48}
                      className="size-12 rounded-xl border object-cover grayscale transition-[filter] duration-500 group-hover:grayscale-0"
                    />
                    <span className="rounded-full border bg-background/60 px-3 py-1 font-mono text-[11px] text-muted-foreground">
                      {role}
                    </span>
                  </div>
                  <h3 className="mt-6 text-lg font-semibold tracking-tight">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section id="faq" className="border-t py-24" aria-label="Frequently asked questions">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
            <Reveal>
              <Kicker>Before you enter</Kicker>
              <h2 className="text-4xl font-semibold tracking-tight">Questions</h2>
            </Reveal>
            <Reveal delay={0.1}>
              <Accordion type="single" collapsible className="rounded-2xl border bg-card/50 px-6">
                {faqs.map(({ q, a }) => (
                  <AccordionItem key={q} value={q} className="last:border-0">
                    <AccordionTrigger className="py-5 text-base hover:no-underline">{q}</AccordionTrigger>
                    <AccordionContent className="text-sm leading-relaxed text-muted-foreground">{a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </Reveal>
          </div>
        </section>

        <Reveal className="pb-24">
          <section className="relative overflow-hidden rounded-3xl border bg-card px-6 py-14 sm:px-12 sm:py-20">
            <div aria-hidden="true" className="bg-grid absolute inset-0 opacity-60" />
            <div
              aria-hidden="true"
              className="absolute -bottom-40 left-1/2 h-80 w-[700px] -translate-x-1/2 rounded-full bg-foreground/5 blur-3xl"
            />
            <div className="relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-end">
              <div>
                <Kicker>A clear idea. A considered entry.</Kicker>
                <h2 className="text-5xl font-semibold tracking-[-0.04em] sm:text-6xl">Explore the terminal.</h2>
              </div>
              <Button
                asChild
                size="lg"
                className="h-12 rounded-full px-7 text-base"
              >
                <Link href={primaryAction.href}>
                  {primaryAction.label}
                  <ArrowIcon className="size-4" />
                </Link>
              </Button>
            </div>
          </section>
        </Reveal>
      </main>
      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-xs text-muted-foreground sm:px-8">
          <Wordmark />
          <span className="hidden md:inline">Ideas move. Your terms stay yours.</span>
          <small>© 2026 Setup Terminal</small>
        </div>
      </footer>
    </div>
  );
}
