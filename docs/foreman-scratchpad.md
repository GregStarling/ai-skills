# Foreman build scratchpad

User direction: use Foreman where it helps, record failures with evidence, make the smallest unblock, keep product moving, and defer broader Foreman cleanup until Model Governor v1 lands. This is an engineering record, not proof that failed Foreman tasks passed.

## Already encountered and repaired locally

| Failure | Evidence / cause | Unblock already applied | Later cleanup |
|---|---|---|---|
| Manifest loader dropped accepted gates and changed graph identity | Original graph gates disappeared through run-plan manifest parsing | Foreman c2f84a7: preserve canonical gates and reject normalization drift | Add a full accepted-plan-to-dispatch contract test |
| Audited revision adoption rejected native materialized waves | Old graph versus serializeTaskGraphWaves representation mismatch | Foreman50605d9: accept exact native serialized old representation only | Consolidate canonical graph boundaries |
| Approved docs/plan.md blocked as forbidden control-plane edit | t00 passed checks but commit failed at22:57UTC | Foreman6880fa8: exact upfront ownership exception, explicit deny still wins | Keep classifier and commit admission shared |
| Preserved repair could not get fresh quality before merge | reverify --mint-quality --merge-preserved-worktree explicitly refused; ordinary merge required current quality | Foreman194d803: existing exact commit/review machinery works in preserved checkout, phase checkout required for integration | Broader checkout lifecycle review, avoid circular recovery preconditions |
| Recovered gates omitted component reuse identity | run-plan rejected all t00 gates with component_reuse_identity_missing after successful reverify | Foreman6f05923: native shared component helper + stale completed-task refresh;104 tests | End-to-end recovery-to-dispatch canary with real files |

These commits are local in /Users/gregpro/foreman on codex/fix-remaining-salvage-defects. No remote publication.

## Remaining findings — defer infrastructure cleanup

### F01: Partial acceptance coverage halts before same-session fixes

- Run: run_20260909T232018Z_68a1e9af; quality quality_run_20260909T233028Z_750903cd.
- Native report: needs_changes, halt_required=false, multiple fix_scope=this_session findings.
- Actual outcome: enhanced coverage marked partial, quality fails, all20 remaining tasks blocked, demands autonomous replan.
- Product issues were repairable: material candidate identity, registry digest mismatch, contradictory binding fields, incomplete JSON Schema and unnecessary root export.
- Unblock: CTO integrates the preserved draft, fixes demonstrated defects in bounded lanes, and uses Foreman for substantive checkpoint reviews. Do not replan the whole v1 graph or rewrite evidence to force pass.
- Later: align partial-coverage correction with intended fix-all lifecycle; replan only when task ownership/requirements truly cannot support correction.

### F02: Recovery integrated gate bootstrap omitted dependencies

- t00 fresh quality passed and merge succeeded; integrated scaffold verifier failed with `tsc: command not found`.
- Unblock: `npm ci` in the phase checkout, then actual `foreman task reverify t00_plan_scaffold`; passed.
- Later: share run-plan dependencyInstallCommandForCheckout bootstrap with gated reverify.

### F03: Integration evidence can target an unrelated checkout

- Existing reverify tests recorded integration success while primary HEAD/content remained pre-merge main.
- Narrow preserved mint+merge path now requires/rechecks the phase branch and tests actual merged contents.
- Existing plain non-mint path and run-plan detached-checkout fallback still deserve review.
- Unblock: primary checkout stays on phase/PKG_302A3DF90DDACB6F-1; all final checks run against actual integrated code.

### F04: Board liveness reports ordinary active quality as stuck

- `foreman logs` during live t01 quality reported finalization_stuck / no live child workers despite active quality session; normal review later completed.
- Unblock: inspect actual process/session and current artifacts; do not reset healthy work from advisory status alone.
- Later: distinguish active reviewer from dead writer when deriving finalization health.

### F05: Review report contradictions and duplicate findings

- t01 report simultaneously calls root export in-scope/clean and high-severity out-of-scope; material-identity issue appears twice with different severities.
- Unblock: CTO checks actual packet/diff, deduplicates by root cause and acts on demonstrated effects. Cosmetic export-list nits do not block delivery.
- Later: report aggregation should preserve provenance and resolve contradiction before computing terminal coverage.

### F06: Excess orchestration before product delivery

- Between22:43UTC and about23:35UTC, only scaffold integrated; application writers ran about17minutes, with the balance in reviews/recovery/orchestration. Earlier planning time excluded.
- User correction: quality first, execution close behind; GEMO.
- Unblock: direct bounded implementation lanes, runnable vertical checkpoints, no checklist-only agents or repeated Foreman maintenance cycles.

## Next entries

Append observed failure, exact run/artifact, root cause if known, smallest unblock, and deferred cleanup. Keep unknowns explicit.

### F07: Checkpoint grill reintroduced superseded task ownership

- Review: grill_20260909T234851810Z_b17d4c1b11b47229, verdict revise, mutation check clean; elapsed about157seconds.
- The explicit plan and AGENTS CTO correction say direct integrated ownership, but the review assumed old .foreman/tasks t18/t19 scopes still governed implementation. This made two wiring-owner questions high/blocking despite root's integration authority.
- Useful finding retained: shadow must actually call governed delegation; refresh must exercise populated upstream modules, not just local endpoint tests.
- Smallest unblock: name root ownership of those concrete seams and their integration checks in docs/native-execution-plan.md. Continue implementation; no task-graph replan or historical evidence rewriting.
- Later cleanup: explicit current execution authority must outrank automatically included stale PRD/task packets in checkpoint review context. This run successfully performed read-only review; the failure was stale authority interpretation, not a crashed reviewer.

## V1 handoff

Model Governor v1 completed through direct CTO integration; see [release evidence](v1-release.json). The original task graph was not restarted and its failed/unfinished task statuses were not rewritten. Foreman's five local repair commits and F01–F07 remain the bounded input to the later infrastructure cleanup. No further Foreman code changes were needed after the checkpoint review.
