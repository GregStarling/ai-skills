# Production receipts into the existing governor

The consumer still needs only the delegate folder. Maintainer-side ingestion archives original receipts, validates independently captured evidence, and feeds the existing qualification and paired-selection pipeline. It does not trust a model-written `accepted` flag or manufacture missing telemetry.

## Capture an original receipt

After building, run `node dist/cli/index.js receipt-ingest --input capture.json`. The request has this shape (replace illustrative paths, identity and time with actual run facts):

```json
{
  "directory": "artifacts/production-ledger",
  "receiptFile": "/project/.delegate/runs/task-123.json",
  "context": {
    "source": "native host trace and maintainer run record",
    "observed_at": "2026-09-10T05:00:00.000Z",
    "origin": "production_usage",
    "public_task_class": "bounded_implementation",
    "task_id": "task-123"
  }
}
```

Use independent native/harness timing. Receipt timestamps have proved unreliable; original values are preserved, not rewritten. Supply `context.baseline_digest` when the immutable starting fixture is available, or preserve the receipt's `starting_artifact_digest`. Assessment requires that captured digest to match the observation's starting fixture; a missing baseline leaves capture pending. Declare `qualification_evaluation` for a benchmark or deliberate acceptance trial. Do not reclassify those runs as production usage.

The command writes to a class subdirectory and returns `PENDING_EVIDENCE`, its actual `directory` and `recordId`. It retains exact UTF-8 receipt bytes and their digest. Identical imports are idempotent; conflicting context for the same receipt version is rejected. A later version has a different content identity and does not overwrite earlier attempts. Preserve the same task identity and immutable starting baseline across repairs and intentional challenger replays.

## Assess independently captured evidence

Run `node dist/cli/index.js receipt-assess --input assess.json` with:

```json
{
  "directory": "artifacts/production-ledger/bounded_implementation",
  "recordId": "receipt_<digest returned by receipt-ingest>",
  "evidenceFile": "reviewed-task-evidence.json"
}
```

The evidence file contains:

- `selection`: the existing governor selection envelope described in [CLI usage](usage-cli.md), with actual policy, registry, canonical candidate treatments, task observations, scope/constraints/cohort, source bytes and runtime reports. Sources accept exact strings or `{encoding: "base64", data: "..."}` for binary artifacts.
- `observationId`: the exact observation being assessed. Its task identity, class, stratum and independently observed time must match capture context. `bounded_backend` maps only to the public `bounded_implementation` label; other governed classes keep their names. No new policy scope is invented.
- `attemptReceipts`: a map from **every** observation attempt ID to its native `runtime_report.v1` digest. Include every attributable worker, review and rework attempt. Costs must agree with the captured report; missing cost stays null. A shared cumulative host total is not a separate measured cost for each child. Known attempt/task latency cannot understate the captured native execution intervals.
- `review`, required for an accepted observation: `selection` for the independently qualified frontier reviewer, `reviewerCandidateId`, `packageDigest`, `implementerSessionId`, and the existing `ReviewProof` fields (`outcome`, final `artifact_digest`, `package_digest`, `runtime_receipt_digest`, session/parent IDs, context kind and inherited-context digest).

This is an evidence assessment, not a request to fill unknown fields with guesses. The existing runtime/evaluation tools generate native reports, hashed sources and task observations; independent review supplies accepted outcomes. A portable receipt alone lacks this full lineage and stays pending until its sources can support it. The review package and final artifact must resolve to captured bytes, the review request must match the worker stratum, and `evaluateReview` enforces current policy requirements. Actual reviewer identity and effort must match its qualified treatment.

Ingestion calls `validateObservations`, validates per-attempt streams/identity/cost, and binds the review to the final artifact. It rejects contradictory or tampered evidence and omitted attempts. Single-treatment failures are eligible observations too; do not export only successes. A run repaired by another worker cannot be attributed as success of the original treatment. Mixed-worker/project receipts remain archived until separately attributable evaluations are available.

Successful assessment appends `delegate_receipt_evidence.v1` without changing the capture, and returns `VALIDATED_OBSERVATION` plus an `evaluationLedgers` reference for refresh. That status does **not** mean qualified. Missing traces or required review prevent assessment; unknown worker identity/effort or cost can remain in an otherwise valid failed observation and cause the existing qualification result to HOLD. Never reduce missing cost to zero.

## Qualify and compare using the existing pipeline

Pass the returned `evaluationLedgers` reference with the intended selection envelope to `refresh`. It revalidates receipt evidence and rejects an assessment under a different policy, rather than importing older, weaker review authority. Reassess under the new policy while retaining the original capture. Source observations and timestamps are unchanged.

The existing `qualify` function applies task count, runtime snapshot/effort, freshness, failure, cost and latency requirements. The existing `select` function compares challengers on matching task IDs and starting fixture digests within the same class, role, risk, constraints, cohort, suite, harness and grader. Repeated versions of one task cannot increase sample size: duplicate task/attempt checks reject such selection inputs. Choose one complete assessed observation per treatment/task; keep its preceding failures and repair costs inside that observation.

Once actual data clears those rules, feed the returned worker/reviewer selection envelopes to `compile-routing-pack`. The result may add qualified routes alongside provisional ones. No separate promotion algorithm, receipt-count shortcut or automatic replacement of an incumbent exists.

Today, configured effort is often observable while served effort or subscription dollar cost is not. More receipts alone cannot remove those qualification gaps. Many public skill classes also lack declared governor evaluation buckets; those require explicit policy and scoped evaluation evidence. Archive useful runs now, and keep these limitations visible.
