// Runs the six fixture posts through real 0G extraction and validation, and
// prints every request ID for the submission.
//
//   npx tsx --env-file=.env.local lib/zerog/run-fixtures.ts

import { FIXTURE_POSTS } from "@/lib/setups/fixture-posts";
import { validateTerms } from "@/lib/setups/validate";
import { extractRevision, extractSetup } from "./extract";

async function main() {
  let failures = 0;

  for (const fixture of FIXTURE_POSTS) {
    const problems: string[] = [];
    let line: string;

    try {
      if (fixture.kind === "post") {
        const { classification, terms, trace } = await extractSetup(fixture.text);
        const v = validateTerms(terms, fixture.text, {
          actionable: classification === "actionable",
          verificationStatus: trace.verificationStatus,
        });
        if (!fixture.expect.classification.includes(classification)) {
          problems.push(`classification ${classification}, want ${fixture.expect.classification.join("|")}`);
        }
        if (v.copyable !== fixture.expect.copyable) {
          problems.push(`copyable ${v.copyable}, want ${fixture.expect.copyable} (${v.errors.join("; ")})`);
        }
        if (fixture.expect.entryPrice && v.entryPrice !== fixture.expect.entryPrice) {
          problems.push(`entry ${v.entryPrice}, want ${fixture.expect.entryPrice}`);
        }
        line = `${classification} copyable=${v.copyable} entry=${v.entryPrice} | ${trace.model} ${trace.requestId} ${trace.verificationStatus}`;
      } else {
        const { revisionType, terms, trace } = await extractRevision(fixture.original, fixture.text);
        const v = validateTerms(terms, `${fixture.original}\n${fixture.text}`, {
          actionable: revisionType === "update",
          verificationStatus: trace.verificationStatus,
        });
        if (revisionType !== fixture.expect.revisionType) {
          problems.push(`revision ${revisionType}, want ${fixture.expect.revisionType}`);
        }
        if (fixture.expect.entryPrice && v.entryPrice !== fixture.expect.entryPrice) {
          problems.push(`entry ${v.entryPrice}, want ${fixture.expect.entryPrice}`);
        }
        line = `${revisionType} entry=${v.entryPrice} | ${trace.model} ${trace.requestId} ${trace.verificationStatus}`;
      }
    } catch (err) {
      line = "error";
      problems.push(err instanceof Error ? err.message : String(err));
    }

    if (problems.length) failures++;
    console.log(`${problems.length ? "FAIL" : "PASS"}  ${fixture.name.padEnd(12)} ${line}`);
    for (const p of problems) console.log(`      ${p}`);
  }

  console.log(`\n${FIXTURE_POSTS.length - failures}/${FIXTURE_POSTS.length} fixtures passed`);
  process.exit(failures ? 1 : 0);
}

main();
