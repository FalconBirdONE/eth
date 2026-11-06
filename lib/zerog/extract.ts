// Structured extraction of trade setups from creator posts, run on 0G.
// The model only proposes fields and quotes; lib/setups/validate.ts decides
// whether the result can be copied.

import { z } from "zod";
import type { Classification, ZeroGTrace } from "@/lib/shared/types";
import { chat, type ChatMessage } from "./client";

const nullableText = z
  .union([z.string(), z.number(), z.null()])
  .optional()
  .transform((v) => (v === null || v === undefined || v === "" ? null : String(v)));

const evidenceSchema = z
  .object({
    asset: nullableText,
    side: nullableText,
    entry_condition: nullableText,
    entry_price: nullableText,
    reference_currency: nullableText,
    target: nullableText,
    invalidation: nullableText,
  })
  .partial()
  .default({});

/** Lowercases and trims, and maps common synonyms, before enum checks. */
function looseEnum<T extends string>(values: readonly [T, ...T[]], synonyms: Record<string, T> = {}) {
  return z
    .preprocess((v) => {
      if (typeof v !== "string") return v;
      const key = v.trim().toLowerCase().replace(/[\s-]+/g, "_");
      return synonyms[key] ?? (key === "" || key === "null" ? null : key);
    }, z.enum(values).nullable().optional())
    .transform((v) => v ?? null);
}

const termsShape = {
  asset: nullableText,
  side: looseEnum(["buy", "sell"], { long: "buy", short: "sell" }),
  entry_condition: looseEnum(["at", "at_or_below", "at_or_above", "market", "unclear"], {
    below: "at_or_below",
    above: "at_or_above",
    limit: "at",
  }),
  entry_price: nullableText,
  reference_currency: nullableText,
  target: nullableText,
  invalidation: nullableText,
  evidence: evidenceSchema,
  reasoning: z.string().optional().default(""),
};

export const extractionSchema = z.object({
  classification: looseEnum(
    ["actionable", "commentary", "ambiguous", "unsupported", "revision_candidate"],
    { revision: "revision_candidate" },
  ).pipe(z.enum(["actionable", "commentary", "ambiguous", "unsupported", "revision_candidate"])),
  ...termsShape,
});

export const revisionSchema = z.object({
  revision_type: looseEnum(["update", "withdrawal", "none"], {
    revision: "update",
    withdrawn: "withdrawal",
  }).pipe(z.enum(["update", "withdrawal", "none"])),
  ...termsShape,
});

export type RawExtraction = z.infer<typeof extractionSchema>;
export type RawRevision = z.infer<typeof revisionSchema>;

export interface Extraction {
  classification: Classification;
  terms: RawExtraction;
  trace: ZeroGTrace;
}

export interface RevisionExtraction {
  revisionType: RawRevision["revision_type"];
  terms: RawRevision;
  trace: ZeroGTrace;
}

const FIELD_RULES = `Fields (use null when the post does not state it; never guess or fill from market knowledge):
- asset: the asset symbol as written, e.g. "ETH", "WETH", "BTC".
- side: "buy" (long) or "sell" (short / take profit exit).
- entry_condition: "at" (enter at a price), "at_or_below" (buy the dip / limit buy at or under a level), "at_or_above" (breakout entry), "market" (enter now), "unclear".
- entry_price: the entry level as a plain decimal string without commas or currency signs, e.g. "2400" or "2412.5". A range like "2380-2400" is ambiguous: use null and classify ambiguous.
- reference_currency: the quote currency the post uses, e.g. "USD", "USDC", "USDT". "$2,400" means "USD".
- target: the take-profit level as a decimal string, or null.
- invalidation: the stop / invalidation level as a decimal string, or null.
- evidence: for every non-null field above, the exact substring of the post text that supports it, copied character for character (keep the original casing, symbols and commas). Never paraphrase.
- reasoning: one short sentence explaining the classification.

Reply with a single JSON object with exactly these keys and nothing else:
{"classification": "...", "asset": null, "side": null, "entry_condition": null, "entry_price": null, "reference_currency": null, "target": null, "invalidation": null, "evidence": {"asset": null, "side": null, "entry_condition": null, "entry_price": null, "reference_currency": null, "target": null, "invalidation": null}, "reasoning": "..."}`;

const EXTRACT_SYSTEM = `You extract trade setups from social media posts by a crypto trading creator.

Classify the post:
- "actionable": a current, forward-looking trade idea with an explicit asset, side and entry price.
- "commentary": market talk, recaps of past trades, results, or anything that is not a trade the reader could enter now.
- "ambiguous": looks like a trade idea but the entry is vague, a range, conditional on something unspecified, or the asset/side is unclear.
- "unsupported": a trade idea that states no entry (for example a target only), or is otherwise not an entry order.
- "revision_candidate": the post changes, moves, cancels or withdraws an earlier call.

Historical posts ("I bought at 2,100 last week", "that long hit target") are commentary, even if they contain prices.

${FIELD_RULES}`;

const REVISION_SYSTEM = `You compare a crypto trading creator's original setup post with the creator's own later reply to it, and decide whether the reply revises the setup.

revision_type:
- "update": the reply explicitly changes the entry, target, invalidation, side or asset of the original setup.
- "withdrawal": the reply explicitly cancels, invalidates or withdraws the setup ("scrap that", "no longer valid", "closing this idea").
- "none": the reply does not change the setup (thanks, commentary, progress updates).

For "update", return the complete revised setup: take changed fields from the reply and keep unchanged fields from the original. For "withdrawal" and "none", return the original setup's fields.

Evidence phrases may be quoted from either the original post or the reply.

${FIELD_RULES.replace('{"classification": "...",', '{"revision_type": "...",')}`;

/** Models sometimes wrap JSON in prose or code fences; take the outer object. */
export function parseJsonObject(content: string): unknown {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("0G response contained no JSON object");
  return JSON.parse(content.slice(start, end + 1));
}

async function run<T>(messages: ChatMessage[], schema: z.ZodType<T>) {
  const { content, trace } = await chat(messages, { json: true });
  let parsed: T;
  try {
    parsed = schema.parse(parseJsonObject(content));
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new ExtractionParseError(`Invalid 0G extraction: ${reason}`, trace);
  }
  return { parsed, trace };
}

export class ExtractionParseError extends Error {
  constructor(
    message: string,
    readonly trace: ZeroGTrace,
  ) {
    super(message);
  }
}

export async function extractSetup(postText: string): Promise<Extraction> {
  const { parsed, trace } = await run(
    [
      { role: "system", content: EXTRACT_SYSTEM },
      { role: "user", content: `Post text:\n"""\n${postText}\n"""` },
    ],
    extractionSchema,
  );
  return { classification: parsed.classification, terms: parsed, trace };
}

export async function extractRevision(
  originalText: string,
  replyText: string,
): Promise<RevisionExtraction> {
  const { parsed, trace } = await run(
    [
      { role: "system", content: REVISION_SYSTEM },
      {
        role: "user",
        content: `Original post:\n"""\n${originalText}\n"""\n\nCreator's reply:\n"""\n${replyText}\n"""`,
      },
    ],
    revisionSchema,
  );
  return { revisionType: parsed.revision_type, terms: parsed, trace };
}
