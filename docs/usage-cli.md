# Local CLI workflow

This guide describes the optional Model Governor engine. The standalone `skills/delegate/SKILL.md` skill does not require these commands, a binding, or an engine checkout.

Run commands from the Model Governor checkout after `npm ci` and `npm run build`. The checkout and the workspace to be edited are separate paths. Commands use JSON/YAML request files and print JSON. No global installation, provider API keys or user configuration changes are needed.

## A reproducible offline example

```sh
node dist/cli/index.js validate-policy policy/constitution.json
node dist/cli/index.js validate-binding fixtures/bindings/valid-initial-backend.json
node dist/cli/index.js validate-binding fixtures/bindings/invalid-invented-rules.json
```

The second command validates a **simulation** envelope containing its exact version 1 policy. The third exits 2. Current policy version 2 references the two real harvested fixture buckets. Passing a simulation fixture never authorizes production.

Create a disposable native bundle and refresh example using the fixture envelope:

```sh
node --input-type=module <<'JS'
import {readFileSync,writeFileSync,mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const directory=mkdtempSync(join(tmpdir(),'governor-example-'));
const envelope=JSON.parse(readFileSync('fixtures/bindings/valid-initial-backend.json','utf8'));
writeFileSync(join(directory,'render.json'),JSON.stringify({...envelope,mode:'adapter-test',directory:join(directory,'native')}));
writeFileSync(join(directory,'refresh.json'),JSON.stringify({selection:envelope.selection,mode:'adapter-test',directory:join(directory,'refresh'),trigger:'Explicit local simulation'}));
console.log(directory);
JS
```

Run `render codex --input <printed-directory>/render.json` or `render claude --input ...` with `node dist/cli/index.js` in front. Run `refresh --input <printed-directory>/refresh.json` to stage a generation. Use the returned `generation` in an apply file `{ "directory": "<printed-directory>/refresh", "generation": "<returned-generation>", "mode": "adapter-test" }`, then call `refresh-apply --input <apply-file>`.

Repeat apply is idempotent. A normal no-change refresh returns HOLD and leaves active state unchanged. A due binding can stage explicit renewal. Generated drift, stale proposals, mode mismatch and insufficient production authority refuse activation.

## Request contracts

`select` and `create-binding` accept a selection envelope:

```text
{policy, registry, candidates, observations, request, mode, now,
 sources?, runtimeReports?, incumbentCandidateId?}
```

`policy`, `registry`, `candidates` and `observations` are the actual versioned objects. `sources` maps content digest to exact source text; `runtimeReports` maps digest to the actual runtime report. `request` contains `role_id`, `task_class_id`, categorical `risk`, `cohort_id`, a concrete shared `constraints` object and its `constraints_digest`. An injected `now` supports reproducible offline analysis. Production execution reloads the designated policy and uses the current clock.

`qualify` accepts `{candidate_id,selection}`. `validate-binding` and `status` accept `{binding,selection}`. `compare` accepts raw same-task pairs and explicit `alpha`/`nonInferiorityMargin`; see the README. `validate-evidence` accepts `{ledger,sources,observations}` and independently recomputes aggregate counts and costs.

`render <claude|codex>` accepts `{binding,selection,mode,directory,policyFile?,outputSchema?}`. `mode` is `production` or disposable `adapter-test`. Production defaults to `policy/constitution.json`. Structured worker/review result schemas are supplied by default when the candidate requires structured output. A rendered bundle proves configuration conformance; the native bridge independently validates it before any production launch.

`delegate` and `plan-delegate` accept:

```text
{authority:{binding,selection,rendered:{directory,artifact}},
 reviewer?:{binding,selection,rendered:{directory,artifact}},
 order, workspace, ledgerDirectory, policyFile?}
```

`order` uses the shared `work_order.v1` schema: `task_id`, `goal`, `role_id`, `task_class_id`, exact or `directory/**` `allowed_paths`, `forbidden_paths`, `acceptance_criteria`, `checks` (`check_id`, `executable`, `args`, `timeout_ms`), `pre_signals`, `protected_paths` (`path`,`signal`), `risk_constraints`, `escalation_conditions`, `max_attempts`, `timeout_ms`, and `return_format: "worker_result.v1"`. Put the ledger outside the edited workspace. Production has no simulation switch or injected transport. `simulateDelegate` is a separate library test API.

`evaluate` runs an explicitly unqualified candidate on real harvested work:

```text
{fixtureId, sourceRepository, workspaceRoot, outputDirectory, candidate,
 cohortId, roleId, risk, constraintsDigest, timeoutMs,
 dependencyDirectory?, ledgerDirectory?}
```

Available fixture IDs are `foreman-t897-reconnect-notice` (hard debugging) and `foreman-t920-derived-gate-id` (bounded backend). Point `sourceRepository` to an authorized local Foreman checkout containing the pinned revisions. Candidate workspaces are new parent exports without tests or history. The grader reconstructs a separate evaluator after execution. An optional dependency directory must match the pinned lock file. Otherwise dependencies are installed only in the evaluator. Native receipts, checks, scope, latency and observed costs are retained. A passing objective grader still has `accepted:false` until the required independent review exists.

`discover` accepts `{sources:[{url,kind,version}],ledgerDirectory}`. Supported kinds are `openai_model`, `claude_models`, `official_document` and `independent_benchmark`; official HTTPS domains and the configured independent evaluator are allowlisted. `data/discovery/sources.json` is a working example. Unknown availability, serving controls and pricing modifiers remain unknown. `enumerate-candidates` takes an admitted immutable registry and enumerates meaningful supported treatments; discovery descriptions alone grant no dispatch authority.

`refresh` accepts `{selection,mode,directory,trigger,policyFile?,incumbent?,discovery?,evaluationLedgers?,evaluations?}`. Existing active state is loaded automatically. An explicit incumbent is `{binding,selection}` and must agree with active state. Ledger inputs are `{directory,recordIds}` with strict raw evaluation envelopes. Explicit native evaluations are `{evaluationId,candidateId,fixtureId,sourceRepository,workspaceRoot,timeoutMs,dependencyDirectory?,bundleRoot?}`; durable IDs prevent accidental repeated spend. Adapter-test mode refuses native evaluation requests. Missing observations remain visible in `missing_evaluations`; the command never changes a failed or unreviewed observation to accepted.

`shadow` runs the library's constrained replay contract. Its request contains `incumbent` (the complete `delegate` request), `challenger` (the `evaluate` request without `ledgerDirectory`), `safety: {network: "disabled", capabilities: ["bounded_file_edit"], irreversible: false}` and a nonempty `runId`. Shadow must be enabled by human policy. Only its admitted read-only check form is supported. Arbitrary shell/test code or unverified native isolation yields an explicit block before traffic. The challenger workspace is exported separately and its changes discarded. The incumbent result remains usable. The quota is local to one library session; each CLI invocation is a new session, not a distributed rate limiter.

## Operational limits

Current runtime version and control evidence is in `docs/runtime-capabilities.json`. Configuration conformance, real provider execution and empirical production qualification are separate outcomes. Required unverified fallback, identity, effort or review-context guarantees block production. An upgrade or new evidence can resolve an operational blocker; a hand-edited binding cannot.

The bundled seed fixtures do not meet the policy's sample requirements, and no reviewed production winner is asserted. The fixture grader is separate and integrity checked, but this is not a claim that arbitrary hostile test code has OS sandbox isolation. Shadow refuses that unsupported case.

Refresh activation uses an exclusive `.apply.lock`, immutable generations and an atomic active pointer. An interrupted apply preserves either the old or complete new active generation. If a crashed process leaves its lock, inspect the recorded process ID and active pointer before an operator removes that stale lock; the runtime never steals a live lock.
