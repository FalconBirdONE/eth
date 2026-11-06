import { FileSearch } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
    <Accordion type="single" collapsible className="border-t">
      <AccordionItem value="evidence" className="border-0">
        <AccordionTrigger className="rounded-none px-5 py-3 text-xs text-muted-foreground hover:bg-accent/40 hover:text-foreground hover:no-underline data-[state=open]:text-primary sm:px-6">
          <span className="flex items-center gap-2">
            <FileSearch className="size-3.5" />
            {label}
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 px-5 pt-1 pb-5 sm:px-6">
          {entries.map((entry) => (
            <div key={entry.label} className="border-l-2 border-primary/40 pl-3">
              <p className="text-[11px] text-muted-foreground">{entry.label}</p>
              <blockquote className="mt-1 text-sm leading-relaxed">
                “{entry.text}”
              </blockquote>
            </div>
          ))}
          {verification && (
            <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
              <p>{verification.status}</p>
              {verification.requestId && (
                <p className="mt-1">
                  0G request ID:{" "}
                  <code className="font-mono text-foreground">
                    {verification.requestId}
                  </code>
                </p>
              )}
            </div>
          )}
          <p className="text-[11px] text-muted-foreground">{note}</p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
