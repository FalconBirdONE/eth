import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeDecimal, validateTerms } from "./validate";

const POST = "Bidding $ETH at $2,400. Target 2,800, invalidation below 2,250.";

const goodTerms = {
  asset: "ETH",
  side: "buy" as const,
  entry_condition: "at_or_below" as const,
  entry_price: "2400",
  reference_currency: "USD",
  target: "2800",
  invalidation: "2250",
  evidence: {
    asset: "$ETH",
    side: "Bidding",
    entry_condition: "Bidding $ETH at",
    entry_price: "$2,400",
    reference_currency: "$2,400",
    target: "Target 2,800",
    invalidation: "invalidation below 2,250",
  },
};

const opts = { actionable: true, verificationStatus: "verified" as const };

test("a fully quoted ETH limit buy is copyable", () => {
  const v = validateTerms(goodTerms, POST, opts);
  assert.deepEqual(v.errors, []);
  assert.equal(v.copyable, true);
  assert.equal(v.entryPrice, "2400");
  assert.equal(v.referenceCurrency, "USD");
});

test("a quote that is not in the post blocks copy", () => {
  const v = validateTerms(
    { ...goodTerms, evidence: { ...goodTerms.evidence, entry_price: "$2,350" } },
    POST,
    opts,
  );
  assert.equal(v.copyable, false);
  assert.match(v.errors.join(), /does not appear/);
});

test("a price that differs from its quote blocks copy", () => {
  const v = validateTerms({ ...goodTerms, entry_price: "2350" }, POST, opts);
  assert.equal(v.copyable, false);
  assert.match(v.errors.join(), /not in its quote/);
});

test("an unquoted target is dropped without blocking", () => {
  const v = validateTerms(
    { ...goodTerms, evidence: { ...goodTerms.evidence, target: null } },
    POST,
    opts,
  );
  assert.equal(v.copyable, true);
  assert.equal(v.target, null);
});

test("non-actionable, wrong asset, sell side and breakout entries are not copyable", () => {
  assert.equal(validateTerms(goodTerms, POST, { ...opts, actionable: false }).copyable, false);
  assert.equal(
    validateTerms({ ...goodTerms, asset: "BTC", evidence: { ...goodTerms.evidence, asset: "at" } }, POST, opts)
      .copyable,
    false,
  );
  assert.equal(validateTerms({ ...goodTerms, side: "sell" }, POST, opts).copyable, false);
  assert.equal(
    validateTerms({ ...goodTerms, entry_condition: "at_or_above" }, POST, opts).copyable,
    false,
  );
});

test("unverified stays copyable, failed verification does not", () => {
  assert.equal(validateTerms(goodTerms, POST, { ...opts, verificationStatus: "unverified" }).copyable, true);
  assert.equal(validateTerms(goodTerms, POST, { ...opts, verificationStatus: "failed" }).copyable, false);
});

test("normalizeDecimal", () => {
  assert.equal(normalizeDecimal("$2,412.50"), "2412.50");
  assert.equal(normalizeDecimal("0.5"), "0.5");
  assert.equal(normalizeDecimal("2380-2400"), null);
  assert.equal(normalizeDecimal("2.4k"), null);
});
