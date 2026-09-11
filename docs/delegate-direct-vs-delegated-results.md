# Direct versus delegated on real TypeScript fixtures

Status: harness and fixture criteria only (plan step M3.2). No pair has run. Results will be appended under dated headings when the counted campaign in plan step M4 executes; they are exploratory evidence with `origin: qualification_evaluation` and `qualification_authority: false`, never route qualification, and no savings claim is made from counters.

## Fixture selection criteria

A fixture is representative of the user's actual work when all of these hold:

1. Harvested from a real TypeScript repository the user works in, at a pinned `parent_revision` whose scoped baseline typecheck is green for the archived paths.
2. Task class `bounded_backend` or `hard_debugging` in the manifest (mapped to routes `bounded_implementation` and `hard_debugging`); no manifest enum change.
3. One to three `allowed_paths` touching a shared function with at least two callers, or a data-shape change.
4. Never a pricing, purchase, authentication or user-data path.
5. The held-out grader was committed to the source repository at `grader_revision` before harvest, was never written during or for a trial, is removed from the candidate by `prepareFixture`, and is digest-pinned in the manifest. Commit authorship and co-author trailers are recorded verbatim below; both existing graders carry a model co-author trailer, which is recorded, not hidden.
6. `prompt_provenance` is stated in the manifest.
7. Direct frontier completion is plausible within ten minutes.

Both arms are told the same single verification command, run inside the candidate: `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json`. Any other discovery command a coordinator runs is recorded from the trace ledger as coordination cost.

## Candidates

| Fixture | Class | Allowed paths | Parent revision | Grader revision | Grader commit author and trailer |
| --- | --- | --- | --- | --- | --- |
| `foreman-t920-derived-gate-id` | `bounded_backend` | `src/acceptance/contracts.ts` | `e407612b` (2026-09-04, Greg Starling, Co-Authored-By: Claude Fable 5.1) | `a0de8d32` (2026-09-04, Greg Starling, Co-Authored-By: Claude Fable 5.1) | grader `src/acceptance/contracts.test.ts`, digest `sha256:fc82b830…` |
| `foreman-t897-reconnect-notice` | `hard_debugging` | `src/pty/codex-conversation-session.ts` | `d22c79a7` (2026-09-01, Greg Starling, Co-Authored-By: Claude Fable 5.1) | `0c99b05f` (2026-09-01, Greg Starling, Co-Authored-By: Claude Fable 5.1) | grader `src/pty/codex-conversation-session.test.ts`, digest `sha256:cda2ab0f…` |

Source repository: `/Users/gregpro/foreman` (ai-foreman), package lock `sha256:b962c1ac…`. Both manifests pass `checkedManifest`; the unedited candidate must grade `behavioral_failure` with the scope check passed before either fixture is used (asserted by the harness tests when the checkout is present).

## Pairing protocol

Per fixture and host: two fresh projects from one manifest with identical `starting_artifact_digest`; arm order alternates per fixture (A: direct then delegated, B: delegated then direct); a mode-free learning scope `harvested-<fixture_id>`; run ids `<pair>-<arm>`; 600 s per trial; at most 1 model execution for the direct arm and 4 for the delegated arm, counting failed launches and repairs; no reruns to replace a failed or blocked arm. Delegated arms run under a recorded evaluation-only scope exception and are labelled out-of-route exploratory evidence. Child environments are sanitized and recorded. Every arm records its skill folder digest, pack content digest, host version, telemetry identity status and, for Codex, the thread id.

Win rule, in order: the quality gate first (both arms pass `gradeFixture` scope, integrity and behavioral checks and a maintainer ledger review: delegated means the worker wrote every changed path and the coordinator inspected the artifact; direct means zero child executions); only then "lower wall clock at n=1" for the arm with lower `task_wall_clock_ms` and no higher rework heuristic; otherwise `direct`, `mixed` or `blocked`. Token and list-price counters are reported per model and never decide.

## Evidence generations

| Generation | Folder digest | Pack | Host versions | Status |
| --- | --- | --- | --- | --- |
| Route evidence (installed acceptance, 2026-09-10T03:09Z) | `sha256:2509569e…` (harness encoding); 12 of 14 cases on earlier iterations; both UI cases assisted | `sha256:88595644…` | Claude 2.1.222, Codex 0.142.5 | historical; this experiment neither refreshes nor validates it |
| Usability pilots (2026-09-10T18:32Z) | `6e3f9cd2…` (harness) | `sha256:e65c17c8…` | 2.1.267, codex-cli 0.154.0 | historical |
| This experiment | recorded per arm from `result.json` | recorded per arm | recorded per arm | pending M4 |

## Results

None yet. Each executed pair will be appended here with fixture, host, order, arm, quality gate, `task_wall_clock_ms`, `helper_tail_ms`, executions including failed launches, rework heuristic, routing reads, per-model counters labelled "host-reported counters / list-price estimates", the verdict author, and the fixed statement: exploratory evidence; not qualification; no measured savings claim; counters are not subscription spending.

## Expansion gate (declared proposal)

Per shape (`bounded_backend`, `hard_debugging`): at least 2 quality-gated pairs, and at least half won or tied by the delegated arm, before any scope expansion is funded. Fewer than 2 pairs is "insufficient evidence"; a failed tally is "no evidence supports delegation for this shape". The gate authorizes evidence spending only, never route authority.

## 2026-09-11 counted campaign

This dated addendum supersedes the M3-only status above. exploratory evidence; not qualification; no measured savings claim; counters are not subscription spending. Arm results and receipts retain their original bytes. The [evidence index](evidence/delegate-direct-vs-delegated-2026-09-11/evidence.json) binds the private result, stdout, baseline, manifest, reviewed ledger and maintainer-review files.

Verdict author: Codex desktop maintainer task; exact model and application version were not exposed in the captured task metadata. Arm versions are recorded separately: Claude Code 2.1.267 and codex-cli 0.154.0. Native Codex turn-context records corroborate configured child model/effort where cited; they do not attest served effort.

### m4-current-claude-1

Fixture: `foreman-t920-derived-gate-id`; host: claude; folder variant: current; order: direct → delegated. Both arms use baseline `sha256:217499caa6ef535cf293124f273ebb9cefae3c5692fa6bbabf8cd0576f90009b` and manifest `sha256:ca00486b5fa6988948fd324370ab1b1b1e769c4e2707799dff5bbbb729f5ef5c`.

| Arm | Quality | Task ms | Tail ms | Total ms | Attempts (failed) | Rework heuristic | Routing Read events | Helper calls | Result digest |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| direct | PASS | 75062 | 30141 | 105203 | 1 (0) | 0 | 0 | 3 | `sha256:ffee4b9f0a5ad343fdbc05fd0eb764acd274bcce3a2288c3b37d8662c40d1b51` |
| delegated | PASS | 136720 | 18410 | 155130 | 2 (0) | 0 | 0 | 4 | `sha256:fb6914fd42ce84e3b069c7638d3bd4035cf41b8071e43bfdb52057efabdb6f98` |

Verdict: **direct**; lower wall clock at n=1. Direct has lower task time and no higher rework heuristic. Reviewed pair digest: `sha256:826cc5983bbcb641589a3a66fd0adcb65ab0a89f187a76901ce7fa01aa987b91`.

Host-reported counters / list-price estimates (kept per original scope, never summed):

- direct: `{"claude-opus-5":{"inputTokens":290,"outputTokens":7916,"cacheReadInputTokens":348776,"cacheCreationInputTokens":48265,"webSearchRequests":0,"costUSD":0.8563880000000001,"contextWindow":1000000,"maxOutputTokens":64000,"thinkingTokens":1549,"canonicalModel":"claude-opus-5","provider":"firstParty","costBasis":"list"}}`

- delegated: `{"claude-opus-5":{"inputTokens":322,"outputTokens":9856,"cacheReadInputTokens":375828,"cacheCreationInputTokens":40122,"webSearchRequests":0,"costUSD":0.837144,"contextWindow":1000000,"maxOutputTokens":64000,"thinkingTokens":2654,"canonicalModel":"claude-opus-5","provider":"firstParty","costBasis":"list"}}`

### m4-current-claude-2

Fixture: `foreman-t897-reconnect-notice`; host: claude; folder variant: current; order: delegated → direct. Both arms use baseline `sha256:8ff0d60bc52200f2b10e68b69bf747f39deba120c0e175a4efe753215ff96fa8` and manifest `sha256:ba46a938be03870be7374c5739eb8599404c43b80140fc7d84c21e47299ad1e4`.

| Arm | Quality | Task ms | Tail ms | Total ms | Attempts (failed) | Rework heuristic | Routing Read events | Helper calls | Result digest |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| delegated | PASS | 139015 | 19426 | 158441 | 2 (0) | 0 | 0 | 4 | `sha256:45e1222bee4541a98d4f5990f173e43304746bd64a50304cd97876f1d1b7f04b` |
| direct | PASS | 89362 | 13766 | 103128 | 1 (0) | 0 | 0 | 3 | `sha256:3727c98b0dc71ced6baa93a91a42d2d4662ed485a1b5432ca39b7c478471fdca` |

Verdict: **direct**; lower wall clock at n=1. Direct has lower task time and no higher rework heuristic. Reviewed pair digest: `sha256:a42a467120a67679f542b3e728d3ce3bb113f3b721d3dfe63f5f9dc3d8272bd5`.

Host-reported counters / list-price estimates (kept per original scope, never summed):

- delegated: `{"claude-opus-5":{"inputTokens":290,"outputTokens":10285,"cacheReadInputTokens":303911,"cacheCreationInputTokens":37545,"webSearchRequests":0,"costUSD":0.7859805,"contextWindow":1000000,"maxOutputTokens":64000,"thinkingTokens":2163,"canonicalModel":"claude-opus-5","provider":"firstParty","costBasis":"list"},"claude-haiku-4-5-20251001":{"inputTokens":34,"outputTokens":2543,"cacheReadInputTokens":51979,"cacheCreationInputTokens":20968,"webSearchRequests":0,"costUSD":0.044156900000000006,"contextWindow":200000,"maxOutputTokens":32000,"thinkingTokens":809,"canonicalModel":"claude-haiku-4-5","provider":"firstParty","costBasis":"list"}}`

- direct: `{"claude-opus-5":{"inputTokens":290,"outputTokens":8449,"cacheReadInputTokens":264633,"cacheCreationInputTokens":30459,"webSearchRequests":0,"costUSD":0.6495815,"contextWindow":1000000,"maxOutputTokens":64000,"thinkingTokens":2355,"canonicalModel":"claude-opus-5","provider":"firstParty","costBasis":"list"}}`

### m4-current-codex-1

Fixture: `foreman-t920-derived-gate-id`; host: codex; folder variant: current; order: direct → delegated. Both arms use baseline `sha256:217499caa6ef535cf293124f273ebb9cefae3c5692fa6bbabf8cd0576f90009b` and manifest `sha256:ca00486b5fa6988948fd324370ab1b1b1e769c4e2707799dff5bbbb729f5ef5c`.

| Arm | Quality | Task ms | Tail ms | Total ms | Attempts (failed) | Rework heuristic | Routing Read events | Helper calls | Result digest |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| direct | PASS | 174753 | 45437 | 220190 | 1 (0) | 0 | 0 | 4 | `sha256:a433f9a49309efdd6ac73c4683449088362c80bdef54c6d717239d1a8619c05f` |
| delegated | PASS | 285494 | 81418 | 366912 | 3 (1) | 1 | 0 | 5 | `sha256:e628ff7380e5cc3836b8d4d378b098ca69c3414c5364db9479f16a5288f22d7e` |

Verdict: **direct**; lower wall clock at n=1. Direct has lower task time and no higher rework heuristic. Reviewed pair digest: `sha256:bcbe0ca7547c549be4344742dbe0bb42c98ee727b02764d13382c43590c35061`.

Host-reported counters / list-price estimates (kept per original scope, never summed):

- direct: `[{"model":null,"model_source":"unknown","scope":"thread_total_child_inclusion_unknown","usage":{"input_tokens":732995,"cached_input_tokens":685952,"cache_write_input_tokens":0,"output_tokens":9123,"reasoning_output_tokens":2807}}]`

- delegated: `[{"model":null,"model_source":"unknown","scope":"thread_total_child_inclusion_unknown","usage":{"input_tokens":1035657,"cached_input_tokens":971904,"cache_write_input_tokens":0,"output_tokens":16433,"reasoning_output_tokens":6229}}]`

### m4-current-codex-2

Fixture: `foreman-t897-reconnect-notice`; host: codex; folder variant: current; order: delegated → direct. Both arms use baseline `sha256:8ff0d60bc52200f2b10e68b69bf747f39deba120c0e175a4efe753215ff96fa8` and manifest `sha256:ba46a938be03870be7374c5739eb8599404c43b80140fc7d84c21e47299ad1e4`.

| Arm | Quality | Task ms | Tail ms | Total ms | Attempts (failed) | Rework heuristic | Routing Read events | Helper calls | Result digest |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| delegated | PASS | 292990 | 54649 | 347639 | 3 (1) | 1 | 0 | 6 | `sha256:782e342e82cd15013b12289e80cf4613d83362d95dd4f285c38bfad5e1c261b6` |
| direct | PASS | 181814 | 41675 | 223489 | 1 (0) | 0 | 0 | 4 | `sha256:b3798d2310dd8a95dff4256548f8e7a0a656ab3f7eae4f7131fa003c62ece248` |

Verdict: **direct**; lower wall clock at n=1. Direct has lower task time and no higher rework heuristic. Reviewed pair digest: `sha256:6feedfc90a27a1d28e98df87e3e5bfee9ff72d56a5159e64d7b35335a11e9eec`.

Host-reported counters / list-price estimates (kept per original scope, never summed):

- delegated: `[{"model":null,"model_source":"unknown","scope":"thread_total_child_inclusion_unknown","usage":{"input_tokens":1014328,"cached_input_tokens":947584,"cache_write_input_tokens":0,"output_tokens":13776,"reasoning_output_tokens":4486}}]`

- direct: `[{"model":null,"model_source":"unknown","scope":"thread_total_child_inclusion_unknown","usage":{"input_tokens":747080,"cached_input_tokens":689024,"cache_write_input_tokens":0,"output_tokens":10138,"reasoning_output_tokens":2988}}]`

### m4-before-claude-1

Fixture: `foreman-t920-derived-gate-id`; host: claude; folder variant: before; order: direct → delegated. Both arms use baseline `sha256:217499caa6ef535cf293124f273ebb9cefae3c5692fa6bbabf8cd0576f90009b` and manifest `sha256:ca00486b5fa6988948fd324370ab1b1b1e769c4e2707799dff5bbbb729f5ef5c`.

| Arm | Quality | Task ms | Tail ms | Total ms | Attempts (failed) | Rework heuristic | Routing Read events | Helper calls | Result digest |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| direct | PASS | 65319 | 22152 | 87471 | 1 (0) | 0 | 0 | 7 | `sha256:a80757045f02dd3edd76cbb5348fa3ca5c5bcbf572c730e051c958a1511752fa` |
| delegated | PASS | 194899 | 22221 | 217120 | 2 (0) | 0 | 0 | 7 | `sha256:760be39cb28f6ef7bc4be783f2ef9b71eaa92005c2ddb976a2900f02e60407d8` |

Verdict: **direct**; lower wall clock at n=1. Direct has lower task time and no higher rework heuristic. Reviewed pair digest: `sha256:e510815ee3bd5712fe87348244dfc7606106925d8ddefad7c22c113aef3fb95c`.

Host-reported counters / list-price estimates (kept per original scope, never summed):

- direct: `{"claude-opus-5":{"inputTokens":290,"outputTokens":6744,"cacheReadInputTokens":291410,"cacheCreationInputTokens":34253,"webSearchRequests":0,"costUSD":0.658285,"contextWindow":1000000,"maxOutputTokens":64000,"thinkingTokens":941,"canonicalModel":"claude-opus-5","provider":"firstParty","costBasis":"list"}}`

- delegated: `{"claude-opus-5":{"inputTokens":418,"outputTokens":14954,"cacheReadInputTokens":655807,"cacheCreationInputTokens":63804,"webSearchRequests":0,"costUSD":1.3418835,"contextWindow":1000000,"maxOutputTokens":64000,"thinkingTokens":4677,"canonicalModel":"claude-opus-5","provider":"firstParty","costBasis":"list"},"claude-haiku-4-5-20251001":{"inputTokens":34,"outputTokens":2423,"cacheReadInputTokens":50955,"cacheCreationInputTokens":20445,"webSearchRequests":0,"costUSD":0.04280075,"contextWindow":200000,"maxOutputTokens":32000,"thinkingTokens":929,"canonicalModel":"claude-haiku-4-5","provider":"firstParty","costBasis":"list"}}`

### m4-before-codex-1

Fixture: `foreman-t920-derived-gate-id`; host: codex; folder variant: before; order: direct → delegated. Both arms use baseline `sha256:217499caa6ef535cf293124f273ebb9cefae3c5692fa6bbabf8cd0576f90009b` and manifest `sha256:ca00486b5fa6988948fd324370ab1b1b1e769c4e2707799dff5bbbb729f5ef5c`.

| Arm | Quality | Task ms | Tail ms | Total ms | Attempts (failed) | Rework heuristic | Routing Read events | Helper calls | Result digest |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| direct | PASS | 161804 | 83482 | 245286 | 1 (0) | 0 | 0 | 7 | `sha256:24eef5891e78033117cd14aab8c670ac6b543ce0c399f901a2bb9c43dba94061` |
| delegated | PASS | 255578 | 67146 | 322724 | 3 (1) | 1 | 0 | 7 | `sha256:afcb4db1b287424a3f1980fa8ed0b4b823084b3a4845efa955b013475e660d27` |

Verdict: **direct**; lower wall clock at n=1. Direct has lower task time and no higher rework heuristic. Reviewed pair digest: `sha256:1e040e4ebc38715b23042fce59f613c75b29b0fd47e295fcf5731b6d6fb9078d`.

Host-reported counters / list-price estimates (kept per original scope, never summed):

- direct: `[{"model":null,"model_source":"unknown","scope":"thread_total_child_inclusion_unknown","usage":{"input_tokens":899134,"cached_input_tokens":838144,"cache_write_input_tokens":0,"output_tokens":11338,"reasoning_output_tokens":4093}}]`

- delegated: `[{"model":null,"model_source":"unknown","scope":"thread_total_child_inclusion_unknown","usage":{"input_tokens":1114423,"cached_input_tokens":1043328,"cache_write_input_tokens":0,"output_tokens":13769,"reasoning_output_tokens":3801}}]`

### Before and current folder

These are separate n=1 trials. Total duration includes verification and helper delivery; it is not a causal estimate of the helper rewrite. Locally declared helper variables were resolved in the replay, recovering the legacy `record` boundary and seven helper calls. Earlier zero-tail ledgers remain preserved.

| Host / arm | Before total ms | Current total ms | Before helper calls | Current helper calls |
| --- | ---: | ---: | ---: | ---: |
| claude / direct | 87471 | 105203 | 7 | 3 |
| claude / delegated | 217120 | 155130 | 7 | 4 |
| codex / direct | 245286 | 220190 | 7 | 4 |
| codex / delegated | 322724 | 366912 | 7 | 5 |

### Expansion decisions

Declared proposal, authorizes evidence spending only, never route authority. Only current-folder pairs contribute; historical-folder comparisons do not supply extra samples.

| Shape | Quality-gated pairs | Delegated wins / ties | Decision | Pair references |
| --- | ---: | ---: | --- | --- |
| bounded_backend | 2 | 0 | no evidence supports delegation for this shape | `m4-current-claude-1`, `m4-current-codex-1` |
| hard_debugging | 2 | 0 | no evidence supports delegation for this shape | `m4-current-claude-2`, `m4-current-codex-2` |

Research rerun completed with matched receipts on: codex. Research completion is an additional requirement, not a substitute for the declared expansion tally. No failed gate is bypassed.

### Capacity, pending rows and accounting

Both capacity preflights passed. Their purpose is capacity only and their hashes are in the evidence index.

| Pending row | Later result | Matched receipt | Executions | Result digest |
| --- | --- | --- | ---: | --- |
| m4-pending-claude-research | INCOMPLETE / blocked: Coordinator inspected retrieved source passages and found a substantive fs.cp claim defect. A second Haiku execution was launched for repair, but coordinator returned before repair completion; host reported stopped and no matched receipt/captured check/finish exists. | false | 3 | `sha256:b134aef51d0dd55c8374a9e0da67a63a69bed43bf0088e01195822f72be376bb` |
| m4-pending-codex-tinybug | PASS: Final code uses nullish default and preserves explicit zero; external grader passes, direct coordinator read the actual resulting file using nl. No child model launch. | true | 1 | `sha256:5b90af4faded846d2ded42d40ef85242286b57beafb9068851b0d427fee37777` |
| m4-pending-codex-research | PASS: Decision-critical fsPromises.cp options and os.tmpdir precedence match the preserved live official pages. Coordinator independently inspected the exact API sections, read the worker report, applied the facts to the final recommendation, passed structural capture, and finished with a matched live_web qualification_evaluation receipt. | true | 3 | `sha256:9a6a0746f95f31c4a24dcc1d60aa9a2581b618ab5ff2465068e666d5d4bce30d` |

M4 consumed 30 attempts (23 core, 7 optional before-folder attempts). The cross-phase ledger at this publication records 44 of the approved 130; implementation and review calls are included there. An unexported Codex launch rejection was charged through a supplemental accounting entry, corroborated by the preserved native session. The raw two-attempt result remains unchanged.

### Limits

- Historical Codex delegated repeat-reminder check returned STATE_BUSY when helper probes overlapped; suppression is unverified for that arm. The artifact quality gate is separate from this lifecycle check.
- Exploratory out-of-route TypeScript fixtures; not route evidence.
- Some Claude arms overlapped maintainer offline checks; later arms ran without the full suite. Load was uncontrolled and n=1 timing is not a causal overhead estimate.
- Legacy record boundaries were recovered by expanding locally declared helper variables in the preserved commands. Original zero-tail ledgers remain untouched. Helper calls are regex-derived; routing_reads counts Read tool events only, not shell reads or reads internal to lookup.
- Host-reported counters / list-price estimates; no counters summed across overlapping scopes.
- Receipt observed fields are agent_asserted; Codex native turn_context is configuration evidence, not served effort.
- Codex direct arms made an additional lookup call; observed helper counts are reported rather than assuming the intended minimum.
- These fixtures do not support general claims about delegation, live web routing, subscription spending, high or critical risk, or governor qualification.
