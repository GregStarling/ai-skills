# Delegate usability results — September 10, 2026

Both installed-skill pilots passed. Implementation workers edited only their assigned JavaScript fixture files; eligible frontier coordinators inspected the actual result, executed checks, and wrote receipts. Both instruction files and the complete copied skill folders were unchanged. These are qualification evaluations of a mechanical JavaScript rename, not evidence of general TypeScript capability.

The implementation is based on ai-skills `0d27fde`, tested consumer/harness commit `8a0ceee`, and the clean project instruction commit `4e0d674805e03d2e29c117e909aea943853f0103`. The three-file project change merged through [PR 683](https://github.com/GregStarling/ebay-lego/pull/683) as `a3975a280e42bcb2a4cc4cbb823e03d33dc9afe0`. Original development checkouts and their indexes were preserved; no global skills were installed.

## Results

Model names below identify requested/configured treatments. Astra means `gpt-6-astra/high`; Fable means `claude-fable-5-1/high`. Native captures determine identity assurance, not these labels. I = reported input tokens, C = cache-read tokens, W = cache-created tokens, O = output tokens. Codex I includes C; Claude reports I, C and W separately. These counters are not comparable subscription charges. Full counters, thinking-token subsets and per-model client estimates remain in the [evidence metadata](evidence/delegate-usability-2026-09-10/evidence.json).

| Host / task | Worker → frontier | Actual writes and verdict | Repair / fallback | Elapsed | Observable usage | Receipt / evidence |
| --- | --- | --- | --- | --- | --- | --- |
| Claude / installed rename | Haiku 4.5/no effort control → Opus 5/high | Worker edited `slug.mjs` and `link.mjs`; independent grader and frontier passed | No repair | 226.7 s | Coordinator I322 C467,865 W63,775 O14,188; worker I42 C87,940 W23,190 O1,431 | Original imported; PENDING_EVIDENCE |
| Codex / installed rename | Spark/low failed launch, then GPT-5.5/low → GPT-5.5/high | Native worker patch changed both assigned files; grader and frontier passed | Sandbox initialization failure; one eligible fallback, no repair | 223.4 s | Coordinator I678,689 C620,544 O9,266; child I75,977 C54,784 O1,069; scopes kept separate | Original imported; PENDING_EVIDENCE |
| Codex / positive quantity | GPT-5.5/low → Astra | Worker fixed `quantity.mjs`; objective passed; ACCEPT | None | 38.0 s, worker + review | Worker I59,543 C46,592 O894; reviewer I31,714 C26,880 O171 | Calibration PASS |
| Codex / defective quantity | Deterministic artifact → Astra | No reviewer writes; objective failed as expected; REPAIR | No rerun | 15.5 s | I47,740 C42,368 O210 | Calibration PASS |
| Codex / valid boundary | Deterministic artifact → Astra | No reviewer writes; objective passed; ACCEPT | No rerun | 19.6 s | I66,502 C55,808 O186 | Calibration PASS |
| Claude / positive quantity | Haiku 4.5/no effort control → Fable | Worker fixed `quantity.mjs`; objective passed; ACCEPT | None | 29.2 s, worker + review | Worker I34 C44,767 W7,029 O1,533; reviewer I66 C16,619 W5,432 O704 | Calibration PASS |
| Claude / defective quantity | Deterministic artifact → Fable | No reviewer writes; objective failed as expected; REPAIR | No rerun | 12.8 s | I66 C16,607 W5,814 O719 | Calibration PASS |
| Claude / valid boundary | Deterministic artifact → Fable | No reviewer writes; objective passed; ACCEPT | No rerun | 10.5 s | I34 C9,169 W5,460 O654 | Calibration PASS |

The Claude pilot's receipt says worker model identity was unavailable to its coordinator. Preserved forwarded worker messages independently identify `claude-haiku-4-5-20251001` and contain its two Edit calls. The original receipt was retained unchanged. Codex's native worker transcript records configured `gpt-5.5`, effort `low`, the actual patch and its checks; it does not attest served identity or effort.

Both project checkouts passed `npx tsc --noEmit` before dispatch. The behavior-only fixture baseline passed, and the new-name acceptance check failed as expected before editing. The initial attempt to run nonexistent `npm run typecheck` is retained separately from the successful standard command. No unrelated application failures were repaired.

## Admission decision

Both three-case maintainer gates passed. Validators derived CONFIGURATION_ATTESTED for Astra and PARTIALLY_RUNTIME_ATTESTED for Fable from preserved request, process, version and stdout sources. All review artifacts stayed unchanged. Expected verdicts were not included in reviewer prompts. Positive runs were staged in the existing host-observations shape, with matching model, effort, host, artifact and stdout digests; negative and boundary cases remain separate calibration evidence.

**Neither frontier was added to the distributed pack.** A dry run of the existing observation-to-route builder expands each staged treatment into seven classes, including UI and research. These three quantity-default cases only support the declared local JavaScript scope. Admission is withheld at publication for that concrete scope mismatch. Adding broader routing authority or new scope plumbing is outside this increment. The passing captures remain available for an explicitly scoped follow-on.

The original 15 provisional routes, reviewer choices and ordering remain unchanged; qualified-route count remains zero. Pack content digest is `sha256:e65c17c8910146e621095f4f94e252603fa39a3a27b6749d2124c1788974f5cc`. Both pilots used that exact pack and the same complete consumer-folder digest recorded in metadata. No later pack is being claimed as tested. Publication validation, current frontier preflight, and the existing medium-smoke source bindings passed.

## Execution accounting and limitations

Five controlled pilot executions include two coordinators, two successful workers and the failed Spark launch. Calibration used eight controlled executions. There were no repairs, reprobes or automatic reruns. Each pilot stayed below 240 seconds; calibration reviewers retained the stricter 90-second limit.

Claude also reports auxiliary Haiku usage in all three Fable reviewer `modelUsage` records. The CLI does not expose the number or purpose of those internal invocations. Thus **13 controlled executions does not certify the strict ceiling over all host-internal model calls**. The auxiliary usage is preserved separately; no additional model execution was launched after it was discovered. No subscription-billing total or savings claim is made.

The observed overhead is substantial for a two-file rename: both coordinators spent time rereading and inspecting routing data before/after a short worker edit. The new context reference supplies guidance; these two cases do not demonstrate reduced token use. Quality and traceable acceptance passed; efficiency improvement requires further measurements, not a larger architecture change.

## Evidence and validation

Private originals live under this repository's `artifacts/delegate-usability/20260910T183203Z/`. The importer returned its `ledger/mechanical_work` subdirectory and these IDs:

- Claude: `receipt_589f62fb63947296bd0141f0db9b83c0f64011e3063350cd47e616d6f70b1010`
- Codex: `receipt_5aec8ea43294fb9cad2716dfb2f43983f9f3cebb93854c32a7ab5726b03bf372`

Exact original import requests/results retain the absolute returned directory. Public metadata uses a labeled repository-relative location. Receipt bytes and digests were not rewritten. PENDING_EVIDENCE is expected: this increment supplies no fully qualified reviewer for accepted governor assessment.

Public [fixture bytes and metadata](evidence/delegate-usability-2026-09-10/evidence.json) omit private project transcripts. Original raw captures retain their own digests privately. The [host report](delegate-host-evidence.md) distinguishes native agents from authenticated CLI controls and records remaining unknowns.

Local ai-skills validation: npm ci, 407 tests, typecheck, build, copied-skill reference closure and routing-pack publication checks passed. Focused regressions cover instruction preservation, overwrite and escaping-symlink refusal, negative/boundary verdict failures, missing/mutated/unresolved evidence, timeouts and hidden expected verdicts. The project branch passed typecheck, lint, tests, build and smoke locally, plus all PR integration and browser CI checks.
