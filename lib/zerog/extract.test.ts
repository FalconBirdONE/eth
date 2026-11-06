import assert from "node:assert/strict";
import { test } from "node:test";
import { extractionSchema, parseJsonObject, revisionSchema } from "./extract";

test("loose enums accept case and synonyms", () => {
  const r = extractionSchema.parse({
    classification: "Actionable",
    side: "Long",
    entry_condition: "at or below",
    entry_price: 2400,
    evidence: { entry_price: "$2,400" },
  });
  assert.equal(r.classification, "actionable");
  assert.equal(r.side, "buy");
  assert.equal(r.entry_condition, "at_or_below");
  assert.equal(r.entry_price, "2400");
  assert.equal(r.evidence.entry_price, "$2,400");
  assert.equal(r.asset, null);
});

test("missing or unknown classification is rejected", () => {
  assert.throws(() => extractionSchema.parse({ side: "buy" }));
  assert.throws(() => extractionSchema.parse({ classification: "bullish" }));
});

test("revision type synonyms", () => {
  assert.equal(revisionSchema.parse({ revision_type: "Withdrawn" }).revision_type, "withdrawal");
  assert.equal(revisionSchema.parse({ revision_type: "revision" }).revision_type, "update");
});

test("JSON is pulled out of fences and prose", () => {
  assert.deepEqual(parseJsonObject('Sure:\n```json\n{"a": {"b": 1}}\n```'), { a: { b: 1 } });
  assert.throws(() => parseJsonObject("no json here"));
});
