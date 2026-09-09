# V1 implementation handoff

Build all 20 requirements and 44 acceptance scenarios in one execution phase.
Use internal dependency checkpoints in this order: foundation proof, Claude
compiler, Codex compiler, real fixtures, ledger, paired inference, production
qualification, discovery, delegation, shadow replay, refresh, final proof.
The former foundation-only phase plan is superseded. The original source's
construction order remains binding; adapters cannot execute before foundation
proof passes. Foreman owns cohesive task boundaries and isolated workers.

Carry these concrete supervisor and native review fixes into the initial graph.

## Ownership and runnable gates

- Shared schemas must land before consumers. Constitution authoring and shared
  contracts can be one cohesive task, followed by consumers.
- A task cannot call a CLI implemented by a later task. Early module gates
  should call modules. Later CLI gates must exercise actual package scripts,
  dispatchers and imported handlers. Assign their wiring to explicit owners.
- An integration task enforcing the whole project must be able to repair the
  files it checks, including package/config files and earlier implementation.
  These repair tasks run after upstream owners, not concurrently.
- Use `npm run --silent COMMAND -- --json` when capturing npm stdout as JSON.
  Check child exit status as well as JSON. Invalid commands need deliberate
  negative-path assertions; do not treat nonzero exits as success.
- A filter selecting zero tests is not a passed gate. Require executed
  assertions, not only an echoed string, AC ID list or self-attesting booleans.
- Ignore generated paths before builds. Keep caches and runtime state out of
  commits and isolated from authoritative evidence.

## Portable library and runtime

- Author canonical source in `skills/delegate/SKILL.md` and
  `skills/refresh-models/SKILL.md`, with shared name/description frontmatter.
  Keep these library sources inert; do not auto-enable them in this checkout
  or modify installed skills. Instructions consume the implemented CLI and
  versioned policy; they must not duplicate model selection in prompt prose.
- Implement a real local subprocess bridge for Claude and Codex and wire it
  into executable delegation. Callback-only mocks do not complete the runtime.
- Preserve OAuth credential locations. Do not use Claude `--bare`, replace
  HOME/CODEX_HOME for isolation or introduce API billing. Read
  `runtime-contracts.md` and `runtime-conformance-checklist.md`.
- Capture executable, argument array, cwd, version, completion event,
  exit/signal/timeout, stdout/stderr digests, usage and observed identity.
  Requested identity is not proof of served identity. Unknown stays unknown.
  Never record secret environment values.
- Configuration conformance, live runtime execution and production acceptance
  are distinct. Fresh process/session and restricted review inputs need
  observation; a `fresh_context: true` assertion is not proof.

## Evaluation and final proof

- Source fixture candidate/calibration documents identify real historical tasks
  with exact parent/fix commits and held-out grader hashes. Fail-before/pass-after
  calibration is grader evidence, not model performance. Preserve lineage.
- `verify:v1` actually executes checks and attributes coverage to results and
  hashed artifacts. Reject failed checks, empty passing reports, unknown
  statuses, missing/tampered evidence and skipped checks counted as passes.
  Include adversarial verification-integrity tests.
- `verify:v1:live` objectively grades a bounded local process from each
  available authenticated provider even when no production binding qualifies.
  This is qualification evaluation, not permission to invent a binding.
  Preserve raw execution/grader evidence. Genuine external blockers need an
  observed reason and cannot count as successful execution or acceptance.
- Passed, failed, blocked and insufficient-evidence are distinct. Synthetic
  algorithm tests and live measurements are distinct.
- Deliver README.md with the verified benchmark-methodology anecdote from
  `benchmark-provenance.md`, tested usage and both skill entry points. Finish
  npm test, typecheck, build, offline and live v1 proof.

No optional UI, global installation, remote publication or fabricated evidence.
