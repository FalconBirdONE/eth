// Decides whether an extracted setup can be copied into the USDC -> WETH
// limit-buy flow. Nothing the model says is trusted without a quote that
// actually appears in the source text.

import type { Evidence, SetupField, VerificationStatus } from "@/lib/shared/types";
import type { RawExtraction } from "@/lib/zerog/extract";

export const SUPPORTED_ASSETS = new Set(["ETH", "WETH"]);
export const SUPPORTED_QUOTES = new Set(["USD", "USDC"]);
const LIMIT_BUY_CONDITIONS = new Set(["at", "at_or_below"]);

const FIELD_KEYS: [SetupField, keyof RawExtraction["evidence"]][] = [
  ["asset", "asset"],
  ["side", "side"],
  ["entryCondition", "entry_condition"],
  ["entryPrice", "entry_price"],
  ["referenceCurrency", "reference_currency"],
  ["target", "target"],
  ["invalidation", "invalidation"],
];

export interface ValidatedTerms {
  asset: string | null;
  side: "buy" | "sell" | null;
  entryCondition: RawExtraction["entry_condition"];
  entryPrice: string | null;
  referenceCurrency: string | null;
  target: string | null;
  invalidation: string | null;
  evidence: Evidence;
  errors: string[];
  /** All checks passed; the caller still applies setup-level gates. */
  copyable: boolean;
}

/** Lowercase, straight quotes, single spaces: tolerant of whitespace only. */
export function normalizeForMatch(s: string): string {
  return s
    .normalize("NFKC")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** "2,400", "$2400.50", "2400" -> "2400" / "2400.50"; null if not a number. */
export function normalizeDecimal(value: string | null): string | null {
  if (value === null) return null;
  const cleaned = value.replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  // Strip leading zeros but keep "0.x".
  return cleaned.replace(/^0+(?=\d)/, "");
}

function normalizeCurrency(value: string | null): string | null {
  if (value === null) return null;
  const v = value.trim().toUpperCase();
  return v === "$" || v === "DOLLARS" ? "USD" : v;
}

export function validateTerms(
  terms: Pick<
    RawExtraction,
    | "asset"
    | "side"
    | "entry_condition"
    | "entry_price"
    | "reference_currency"
    | "target"
    | "invalidation"
    | "evidence"
  >,
  sourceText: string,
  opts: { actionable: boolean; verificationStatus: VerificationStatus },
): ValidatedTerms {
  const errors: string[] = [];
  const haystack = normalizeForMatch(sourceText);
  const evidence: Evidence = {};

  const values: Record<SetupField, string | null> = {
    asset: terms.asset,
    side: terms.side,
    entryCondition: terms.entry_condition,
    entryPrice: terms.entry_price,
    referenceCurrency: terms.reference_currency,
    target: terms.target,
    invalidation: terms.invalidation,
  };

  // Every stated field needs a verbatim quote from the post.
  for (const [field, key] of FIELD_KEYS) {
    if (values[field] === null) continue;
    const phrase = terms.evidence[key] ?? null;
    if (!phrase) {
      // A missing quote for an optional field drops the field rather than
      // blocking the whole setup.
      if (field === "target" || field === "invalidation") {
        values[field] = null;
        errors.push(`${field} has no supporting quote and was dropped`);
      } else {
        errors.push(`${field} has no supporting quote`);
      }
      continue;
    }
    if (!haystack.includes(normalizeForMatch(phrase))) {
      errors.push(`${field} quote "${phrase}" does not appear in the post`);
      if (field === "target" || field === "invalidation") values[field] = null;
      continue;
    }
    evidence[field] = phrase;
  }

  const entryPrice = normalizeDecimal(values.entryPrice);
  const target = normalizeDecimal(values.target);
  const invalidation = normalizeDecimal(values.invalidation);
  const asset = values.asset?.trim().toUpperCase() ?? null;
  const referenceCurrency = normalizeCurrency(values.referenceCurrency);

  if (values.entryPrice !== null && entryPrice === null) {
    errors.push(`entry price "${values.entryPrice}" is not a decimal number`);
  }
  if (entryPrice !== null) {
    if (Number(entryPrice) <= 0) errors.push("entry price must be positive");
    // The quoted phrase for the price must contain the same number.
    const quoted = evidence.entryPrice?.replace(/,/g, "");
    const bare = entryPrice.includes(".") ? entryPrice.replace(/\.?0+$/, "") : entryPrice;
    if (quoted && !quoted.includes(bare)) {
      errors.push(`entry price ${entryPrice} is not in its quote "${evidence.entryPrice}"`);
    }
  }

  // Fit to the only flow we support: a USDC -> WETH limit buy.
  const flowErrors: string[] = [];
  if (!opts.actionable) flowErrors.push("post is not an actionable setup");
  if (entryPrice === null) flowErrors.push("no explicit entry price");
  if (!asset || !SUPPORTED_ASSETS.has(asset)) flowErrors.push(`asset ${asset ?? "missing"} is not ETH/WETH`);
  if (values.side !== "buy") flowErrors.push(`side ${values.side ?? "missing"} is not a buy`);
  if (!values.entryCondition || !LIMIT_BUY_CONDITIONS.has(values.entryCondition)) {
    flowErrors.push(`entry condition ${values.entryCondition ?? "missing"} is not a limit buy`);
  }
  if (!referenceCurrency || !SUPPORTED_QUOTES.has(referenceCurrency)) {
    flowErrors.push(`reference currency ${referenceCurrency ?? "missing"} is not USD/USDC`);
  }
  if (opts.verificationStatus === "failed") {
    flowErrors.push("0G TEE signature did not verify");
  }

  const blocking = errors.filter((e) => !e.endsWith("was dropped"));
  return {
    asset,
    side: values.side as "buy" | "sell" | null,
    entryCondition: values.entryCondition as RawExtraction["entry_condition"],
    entryPrice,
    referenceCurrency,
    target,
    invalidation,
    evidence,
    errors: [...errors, ...flowErrors],
    copyable: blocking.length === 0 && flowErrors.length === 0,
  };
}
