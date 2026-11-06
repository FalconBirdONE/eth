# x-0g-ingestion (Person A)

Creator posts on X become setups with versions and evidence, extracted on 0G Private Computer.

## Environment (`.env.local`, all server-side)

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Supabase Postgres |
| `X_BEARER_TOKEN` | X API v2 app bearer token (needs Post lookup and Recent Search) |
| `X_CREATOR_USERNAMES` | Comma-separated creators to track, e.g. `demo_creator` |
| `ZEROG_API_KEY` | 0G Router inference key (`sk-...`) |
| `ZEROG_MODEL` | Optional, default `glm-5.3` (must be a TeeML/TeeTLS model while the trust tier is pinned) |
| `ZEROG_BASE_URL` | Optional, default `https://router-api.0g.ai/v1` |
| `ZEROG_TRUST_MODE` | Optional: `verified` (default), `private`, or `standard` to drop the TEE pin |
| `CRON_SECRET` | Sent by Supabase Cron to `/api/ingest` |
| `ADMIN_SECRET` | For the reviewer route |

## Routes

- `GET /api/setups` returns `SetupsResponse` (`{ setups: SetupCard[], lastSyncAt }`).
- `GET /api/setups/[id]` returns `SetupDetailResponse` (`{ setup, card }`). Versions are listed accepted first, then pending candidates.
- `POST /api/analyze` takes `{ url }` and returns `AnalyzeResponse`. A post that was already analyzed returns its stored result and makes no new 0G call.
- `POST /api/ingest` requires `Authorization: Bearer $CRON_SECRET`. Schedule it about every minute.
- `GET /api/setups/attestations` returns a compact list of accepted versions, read by the Chainlink CRE attestor (see [cre/README.md](../../cre/README.md)).
- `POST /api/setups/[id]/review` takes `{ versionId, action: "accept" | "reject" }` and requires `Authorization: Bearer $ADMIN_SECRET`.

Types are in `lib/shared/types.ts`. Fixtures are in `lib/shared/fixtures/setups.ts`.

**For C:** show Buy Now, Copy Entry and Customize Entry only when `card.copyable` is true. A `verificationStatus` of `unverified` is still copyable, but label it. `hasPendingReview` means the creator replied and the team has not reviewed the reply yet.

## Supabase Cron (for D)

```sql
select cron.schedule('ingest-x', '* * * * *', $$
  select net.http_post(
    url := 'https://<app>.vercel.app/api/ingest',
    headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>')
  );
$$);
```

## Scripts

```bash
npx tsx --env-file=.env.local lib/x/proof.ts <post link>        # day-one X proof
npx tsx --env-file=.env.local lib/zerog/run-fixtures.ts         # six fixture posts through real 0G
npx tsx --env-file=.env.local lib/setups/review-cli.ts          # list pending candidates
npx tsx --env-file=.env.local lib/setups/review-cli.ts accept <versionId>
npx tsx --env-file=.env.local lib/zerog/request-log.ts          # every 0G request ID, for submission
npx tsx --test lib/setups/validate.test.ts
TEST_DATABASE_URL=... npx tsx --test --test-force-exit lib/setups/pipeline.test.ts   # wipes that DB
```

## Schema notes (for D)

The provisional `db/schema.ts` has `source_posts`, `setups`, `setup_versions` and one extra table, `ingest_state`, which holds the search cursor and the last sync time. When the final schema lands, keep these columns or tell A what changed. The invariant: accepting a revision moves `setups.current_version_id` in one transaction. It never edits an existing version, so orders that point at a version are unaffected.
