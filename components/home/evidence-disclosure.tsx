import { exampleSetup as setup } from "@/lib/example-setup";
export function EvidenceDisclosure() {
  return (
    <details className="evidence">
      <summary>
        View evidence <span aria-hidden="true">+</span>
      </summary>
      <div className="evidence-reveal">
        <div className="evidence-content">
          <p className="small-label">Entry from the original post</p>
          <blockquote>“{setup.supportingText}”</blockquote>
          <p className="small-label">Creator’s reply</p>
          <blockquote>“{setup.creatorReply}”</blockquote>
          <p className="muted">
            Illustrative source text. No live X post is linked.
          </p>
        </div>
      </div>
    </details>
  );
}
