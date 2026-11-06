import { exampleSetup as setup } from "@/lib/example-setup";
type Evidence = { label: string; text: string };
export function EvidenceDisclosure({
  label = "View evidence",
  entries = [
    { label: "Entry from the original post", text: setup.supportingText },
    { label: "Creator’s reply", text: setup.creatorReply },
  ],
  note = "Illustrative source text. No live X post is linked.",
  verification,
}: {
  label?: string;
  entries?: Evidence[];
  note?: string;
  verification?: { requestId?: string; status: string };
}) {
  return (
    <details className="evidence">
      <summary>
        {label}
        <span aria-hidden="true">+</span>
      </summary>
      <div className="evidence-reveal">
        <div className="evidence-content">
          {entries.map((entry) => (
            <div key={entry.label}>
              <p className="small-label">{entry.label}</p>
              <blockquote>“{entry.text}”</blockquote>
            </div>
          ))}
          {verification && (
            <div className="verification-status">
              <p>{verification.status}</p>
              {verification.requestId && (
                <p>
                  0G request ID: <code>{verification.requestId}</code>
                </p>
              )}
            </div>
          )}
          <p className="muted">{note}</p>
        </div>
      </div>
    </details>
  );
}
