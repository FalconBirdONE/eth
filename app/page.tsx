import { Navbar, Wordmark } from "@/components/home/navbar";
import { HomeExperience } from "@/components/home/home-experience";
import { ArrowIcon } from "@/components/home/icons";
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
export default function Home() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Navbar />
      <main id="main" className="page-shell">
        <HomeExperience />
        <section id="how-it-works" className="how-section">
          <div className="section-heading">
            <span className="section-kicker">How it works</span>
            <h2>
              Conviction is theirs.
              <br />
              The decision is yours.
            </h2>
          </div>
          <div className="steps">
            {steps.map((step, index) => (
              <article className="step" key={step.title}>
                <span className="step-number">0{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
                <span className="step-detail">{step.detail}</span>
              </article>
            ))}
          </div>
        </section>
        <section className="powers" aria-labelledby="powers-heading">
          <h2 id="powers-heading">
            What powers
            <br />
            the terminal
          </h2>
          <div>
            <h3>0G Private Computer</h3>
            <p>
              Interprets posts and replies and surfaces the evidence behind each
              extracted term.
            </p>
          </div>
          <div>
            <h3>Uniswap</h3>
            <p>Quotes and executes Buy Now swaps.</p>
          </div>
          <div>
            <h3>Definitive Flash</h3>
            <p>Places and tracks the limit orders followers sign.</p>
          </div>
        </section>
        <section className="faq" aria-label="Frequently asked question">
          <span className="section-kicker">Before you enter</span>
          <details>
            <summary>
              Does copying a setup place a trade automatically?
              <span aria-hidden="true">+</span>
            </summary>
            <p>
              Copying prefills the order review. You choose your size and
              confirm the terms before signing.
            </p>
          </details>
        </section>
        <section className="closing">
          <div>
            <span className="section-kicker">
              A clear idea. A considered entry.
            </span>
            <h2>Explore the terminal.</h2>
          </div>
          <a className="button button-primary" href={primaryAction.href}>
            {primaryAction.label}
            <ArrowIcon />
          </a>
        </section>
      </main>
      <footer className="page-shell footer">
        <Wordmark />
        <span>Ideas move. Your terms stay yours.</span>
        <small>© 2026 Setup Terminal</small>
      </footer>
    </>
  );
}
