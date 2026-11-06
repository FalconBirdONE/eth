// Integration test for ingest, revisions, review and availability against a
// real Postgres, with X and 0G stubbed at fetch. Skipped without a database.
//
//   TEST_DATABASE_URL=postgres://... npx tsx --test --test-force-exit lib/setups/pipeline.test.ts
//
// The database must have the schema applied and is wiped by this test.

import assert from "node:assert/strict";
import { before, test } from "node:test";

const DB_URL = process.env.TEST_DATABASE_URL;

const AUTHOR = { id: "1700000000000000001", username: "demo_creator" };
const ORIGINAL = "New setup: bidding $ETH at $2,400. Target 2,800, invalidation below 2,250.";

let nextId = BigInt("1855000000000000000");
function tweet(text: string, inReplyTo?: string) {
  nextId += BigInt(1);
  return {
    id: nextId.toString(),
    text,
    author_id: AUTHOR.id,
    created_at: new Date(Number(nextId % BigInt(1_000_000)) * 1000 + Date.UTC(2026, 10, 6)).toISOString(),
    conversation_id: inReplyTo ?? nextId.toString(),
    ...(inReplyTo ? { referenced_tweets: [{ type: "replied_to", id: inReplyTo }] } : {}),
  };
}

// What the fake X returns.
const x = {
  search: [] as ReturnType<typeof tweet>[],
  searchFails: false,
  sinceIds: [] as (string | null)[],
  deleted: new Set<string>(),
};

// What the fake 0G returns, keyed by a substring of the last user message.
type Answer = Record<string, unknown> | "fail";
const zeroG = new Map<string, Answer>();
let zeroGCalls = 0;

const actionable = {
  classification: "actionable",
  asset: "ETH",
  side: "buy",
  entry_condition: "at_or_below",
  entry_price: "2400",
  reference_currency: "USD",
  target: "2800",
  invalidation: "2250",
  evidence: {
    asset: "$ETH",
    side: "bidding",
    entry_condition: "bidding $ETH at",
    entry_price: "$2,400",
    reference_currency: "$2,400",
    target: "Target 2,800",
    invalidation: "invalidation below 2,250",
  },
};

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });
}

const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);

  if (url.hostname === "api.x.com") {
    const includes = { users: [AUTHOR] };
    if (url.pathname === "/2/tweets/search/recent") {
      if (x.searchFails) return json({ title: "Too Many Requests" }, 429);
      const since = url.searchParams.get("since_id");
      x.sinceIds.push(since);
      const data = x.search.filter((t) => !since || BigInt(t.id) > BigInt(since));
      const ids = data.map((t) => BigInt(t.id));
      const newest = ids.length ? ids.reduce((a, b) => (a > b ? a : b)).toString() : undefined;
      return json({ data: data.length ? data : undefined, includes, meta: { newest_id: newest, result_count: data.length } });
    }
    if (url.pathname === "/2/tweets") {
      const ids = url.searchParams.get("ids")!.split(",");
      const data = x.search.filter((t) => ids.includes(t.id) && !x.deleted.has(t.id));
      return json({ data, includes, errors: ids.filter((i) => x.deleted.has(i)).map((i) => ({ resource_id: i, title: "Not Found Error" })) });
    }
    const id = url.pathname.split("/").pop()!;
    const found = x.search.find((t) => t.id === id && !x.deleted.has(id));
    return found ? json({ data: found, includes }) : json({ errors: [{ title: "Not Found Error" }] });
  }

  if (url.hostname === "zerog.test") {
    zeroGCalls++;
    const body = JSON.parse(String(init?.body));
    assert.equal(body.verify_tee, true);
    const prompt: string = body.messages.at(-1).content;
    // Latest key first: revision prompts also contain the original post.
    const key = [...zeroG.keys()].reverse().find((k) => prompt.includes(k));
    const answer = key ? zeroG.get(key)! : { classification: "commentary", evidence: {} };
    const requestId = `req-${zeroGCalls}`;
    if (answer === "fail") return json({ error: { code: "provider_timeout" }, x_0g_trace: { request_id: requestId } }, 504);
    return json(
      {
        id: `chat-${zeroGCalls}`,
        model: "glm-test",
        choices: [{ message: { content: "```json\n" + JSON.stringify(answer) + "\n```" } }],
        x_0g_trace: { request_id: requestId, provider: "0xprovider", tee_verified: true },
      },
      200,
      { "ZG-Res-Key": `zg-${zeroGCalls}` },
    );
  }

  return realFetch(input, init);
};

process.env.DATABASE_URL = DB_URL;
process.env.X_BEARER_TOKEN = "test";
process.env.X_CREATOR_USERNAMES = "@demo_creator";
process.env.ZEROG_API_KEY = "test";
process.env.ZEROG_BASE_URL = "https://zerog.test/v1";

// Imported after env and fetch are in place.
const load = async () => ({
  ...(await import("@/lib/db")),
  ...(await import("@/lib/setups/ingest")),
  ...(await import("@/lib/setups/cards")),
  ...(await import("@/lib/setups/review")),
  ...(await import("@/lib/setups/pipeline")),
  schema: await import("@/db/schema"),
  drizzle: await import("drizzle-orm"),
});
let m: Awaited<ReturnType<typeof load>>;

const original = tweet(ORIGINAL);
const targetOnly = tweet("$ETH is heading to 3,000 this month. Mark my words.");
const historical = tweet("Bought $ETH at 2,100 last week and it's already up 15%.");

const opts = { skip: DB_URL ? false : "TEST_DATABASE_URL not set" };

before(async () => {
  if (!DB_URL) return;
  m = await load();
  await m.getDb().execute(
    m.drizzle.sql`truncate setup_versions, setups, source_posts, ingest_state cascade`,
  );
});

test("ingest stores posts once, creates setups and advances the cursor", opts, async () => {
  x.search.push(original, targetOnly, historical);
  zeroG.set(ORIGINAL, actionable);
  zeroG.set("heading to 3,000", {
    classification: "unsupported",
    asset: "ETH",
    target: "3000",
    evidence: { asset: "$ETH", target: "heading to 3,000" },
  });

  const report = await m.runIngest();
  assert.equal(report.creators[0].stored, 3);
  assert.equal(report.extracted.length, 3);

  const cards = await m.listSetupCards();
  assert.equal(cards.length, 2, "commentary does not become a setup");
  const main = cards.find((c) => c.sourcePostUrl.endsWith(original.id))!;
  assert.equal(main.copyable, true);
  assert.equal(main.currentVersion.entryPrice, "2400");
  assert.equal(main.zeroGRequestId.startsWith("req-"), true);
  assert.equal(main.currentVersion.zeroG.chatId?.startsWith("zg-"), true);
  assert.equal(main.verificationStatus, "verified");
  assert.ok(main.lastSyncAt);
  const info = cards.find((c) => c.sourcePostUrl.endsWith(targetOnly.id))!;
  assert.equal(info.copyable, false, "target-only stays informational");

  const callsBefore = zeroGCalls;
  const again = await m.runIngest();
  assert.equal(again.creators[0].stored, 0);
  assert.equal(x.sinceIds.at(-1), historical.id, "cursor advanced to newest stored post");
  assert.equal(zeroGCalls, callsBefore, "done posts are not re-extracted");
});

test("a failed search leaves the cursor and last sync untouched", opts, async () => {
  const before = await m.getLastSyncAt();
  x.searchFails = true;
  const report = await m.runIngest();
  x.searchFails = false;
  assert.ok(report.creators[0].error);
  assert.equal(await m.getLastSyncAt(), before);
  await m.runIngest();
  assert.equal(x.sinceIds.at(-1), historical.id);
});

test("a failed extraction is retried on the next run", opts, async () => {
  const flaky = tweet("Bidding $ETH at $2,300 here.");
  x.search.push(flaky);
  zeroG.set("$2,300 here", "fail");
  const first = await m.runIngest();
  assert.ok(first.extracted.find((e) => e.postId === flaky.id)?.error);

  zeroG.set("$2,300 here", {
    ...actionable,
    entry_price: "2300",
    target: null,
    invalidation: null,
    evidence: { asset: "$ETH", side: "Bidding", entry_condition: "Bidding $ETH at", entry_price: "$2,300", reference_currency: "$2,300" },
  });
  const second = await m.runIngest();
  assert.equal(second.extracted.find((e) => e.postId === flaky.id)?.classification, "actionable");
});

test("a creator reply becomes a candidate, and accepting it moves only the pointer", opts, async () => {
  const reply = tweet("Update: moving my $ETH entry down to $2,350. Target and invalidation unchanged.", original.id);
  x.search.push(reply);
  zeroG.set("moving my $ETH entry down", {
    revision_type: "update",
    ...actionable,
    entry_price: "2350",
    evidence: { ...actionable.evidence, entry_price: "$2,350" },
  });
  await m.runIngest();

  let card = (await m.listSetupCards()).find((c) => c.sourcePostUrl.endsWith(original.id))!;
  assert.equal(card.hasPendingReview, true);
  assert.equal(card.currentVersion.entryPrice, "2400", "pending candidate does not move the pointer");
  const v1Id = card.currentVersion.id;

  const detail = (await m.loadSetup(card.setupId))!;
  const candidate = detail.setup.versions.find((v) => v.reviewStatus === "pending")!;
  assert.equal(candidate.kind, "revision");

  const result = await m.reviewCandidate(card.setupId, candidate.id, "accept");
  assert.equal(result.versionNumber, 2);
  await assert.rejects(m.reviewCandidate(card.setupId, candidate.id, "accept"), /already accepted/);

  card = (await m.listSetupCards()).find((c) => c.setupId === card.setupId)!;
  assert.equal(card.currentVersion.entryPrice, "2350");
  assert.equal(card.previousVersion?.id, v1Id);
  assert.equal(card.previousVersion?.entryPrice, "2400", "original version is not overwritten");
  assert.deepEqual(card.changedFields, ["entryPrice"]);
  assert.equal(card.copyable, true);
});

test("an accepted withdrawal disables copying", opts, async () => {
  const reply = tweet("Scrap this setup, it's no longer valid.", original.id);
  x.search.push(reply);
  zeroG.set("Scrap this setup", { revision_type: "withdrawal", ...actionable });
  await m.runIngest();

  const card = (await m.listSetupCards()).find((c) => c.sourcePostUrl.endsWith(original.id))!;
  const pending = (await m.loadSetup(card.setupId))!.setup.versions.find((v) => v.reviewStatus === "pending")!;
  assert.equal(pending.kind, "withdrawal");
  await m.reviewCandidate(card.setupId, pending.id, "accept");

  const after = (await m.getSetupCard(card.setupId))!;
  assert.equal(after.status, "withdrawn");
  assert.equal(after.copyable, false);
  assert.equal(after.currentVersion.entryPrice, "2350", "withdrawal keeps the revised terms");
  assert.deepEqual(after.changedFields, []);
});

test("an unavailable source post disables copying until it is back", opts, async () => {
  const card = (await m.listSetupCards()).find((c) => c.currentVersion.entryPrice === "2300")!;
  assert.equal(card.copyable, true);
  const postId = card.sourcePostUrl.split("/").pop()!;

  x.deleted.add(postId);
  const r = await m.recheckAvailability(true);
  assert.deepEqual(r?.unavailable, [postId]);
  assert.equal((await m.getSetupCard(card.setupId))!.copyable, false);

  x.deleted.delete(postId);
  await m.recheckAvailability(true);
  assert.equal((await m.getSetupCard(card.setupId))!.copyable, true);
});

test("processing a stored post again is a no-op", opts, async () => {
  const [row] = await m
    .getDb()
    .select()
    .from(m.schema.sourcePosts)
    .where(m.drizzle.eq(m.schema.sourcePosts.xPostId, original.id));
  const calls = zeroGCalls;
  const r = await m.processPost(row);
  assert.equal(r.classification, "actionable");
  assert.ok(r.setupId);
  assert.equal(r.trace?.verificationStatus, "verified", "stored trace is returned");
  assert.equal(zeroGCalls, calls);
});
