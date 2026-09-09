# Independent runtime conformance review

Scope: task_graph_PKG_8D47EB6085B28311-1 tasks t8, t9, t15, t18 plus docs/runtime-contracts.md. Read-only review, 2026-09-09. No implementation files existed at inspection; these are concrete gate/design gaps, not claims of code defects.

## Priority findings

1. **t18 live proof gate accepts fabricated integrations.** It checks presence of cli_available/runtime_version/requested_config/result_status and truthiness of four optional safety booleans only. Reproduced offline: two records with cli_available=false, runtime_version=null, requested_config=null, result_status="fabricated" and no other fields pass the exact structural predicate. No subprocess invocation, stdout/stderr capture, stream digest, objective grader, served model, usage, status enum, or blocker evidence is required. Add strict report schema plus independently recomputed evidence references; recognized blocked status must have real observed reason and must not count as provider exercise success.
2. **t18 offline proof is self-attestation.** Flags synthetic_artifacts_labeled, harvested_artifacts_labeled, production_rejects_synthetic and claims_offline_as_live are uncorrelated with actual artifacts/test results. Acceptance IDs can be pasted into a list. Recompute coverage from executed test/check records with source references, command exit codes, versioned artifacts and known outcomes; test the synthetic-to-production rejection through the public CLI.
3. **t18 JSON capture likely breaks.** `npm run verify:v1 -- --json > file` normally writes npm's script banner before JSON. Use `npm run --silent ...`, a CLI `--output` report file, or invoke compiled CLI directly. Do not loosen parser to silently discard arbitrary invalid output.
4. **t8/t9 adapter tests can prove only internal strings.** Gate names do not demand a native parser/load probe. Require actual Claude YAML agent shape and Codex standalone TOML fields and paths from runtime contracts, with versioned conformance fixtures; test escaping adversarial names/instructions, missing and extra generated artifacts, independently computed digests, and reload semantics. Separately identify parser-only/offline verification versus exercised native dispatch.
5. **t15 permits a callback-only runtime to look complete.** Require an actual production subprocess bridge or native dispatch implementation wired into CLI, not just an injectable test callback. Capture exact executable, arguments as array, cwd, controlled override names (no secret values), runtime version, actual exit/signal/timeout, stdout/stderr files and hashes, and parsed native events. Fake process tests must be labeled and cannot produce production evidence.
6. **Fresh review must be demonstrable.** A new process/session/context ID plus admissible package hash and instruction-source treatment is needed. `fresh_context: true`, worktree isolation, or no-session-persistence alone are insufficient. No resume/fork/continue or parent transcript injection. Artifact snapshot must include staged/unstaged/untracked changes, renamed/deleted/binary files and initial dirty-worktree baseline. Recheck artifact digest after checks/review and immediately before acceptance.

## Installed CLI facts that preserve OAuth dispatch

Reconfirmed `codex-cli 0.142.5`, `Claude Code 2.1.222`.

- **Do not use Claude `--bare` for subscription OAuth.** Local help explicitly says it skips keychain reads and Anthropic authentication is strictly ANTHROPIC_API_KEY or apiKeyHelper from settings; OAuth/keychain are never read. This would make the user's working local login unavailable.
- **Do not isolate auth by replacing HOME or CODEX_HOME.** Codex `--ignore-user-config` skips its config but explicitly continues to read auth from CODEX_HOME. Retain auth location. `--ephemeral` affects persistence, not credentials or fresh-context provenance.
- Claude `--safe-mode` preserves auth/model/built-in tools/permissions but disables custom skills and agents. It can support an explicit prompt-based CLI review bridge; it cannot simultaneously demonstrate loading generated custom agent/skill files.
- Claude native invocation supports `-p --model ID --effort LEVEL --output-format json|stream-json --json-schema JSON --no-session-persistence`. The schema is a JSON value; Codex `--output-schema PATH` is a file path. Do not interchange them.
- Codex native invocation uses `exec --model ID -c 'model_reasoning_effort="LEVEL"' --json --output-schema PATH -C DIRECTORY`. There is **no Codex `--effort` flag** in this help. Pass TOML strings without literal backslash escaping in a spawn argument.
- Set model AND effort. Explicitly preflight conflicting CLAUDE_CODE_SUBAGENT_MODEL and CLAUDE_CODE_EFFORT_LEVEL values. Scope adjustments to child environment; never mutate global settings.
- Fallback is a material candidate setting. Claude `--fallback-model` enables an ordered fallback chain in print mode. Do not add it for a no-fallback binding. Runtime-unobserved fallback status remains unknown, not false.
- Fresh Claude process omits `--resume`, `--continue`, `--fork-session`; fresh Codex process runs `exec`, not `exec resume`. Independent reviewer may still load on-disk instructions/memory unless the bridge handles these explicitly.

## Evidence requirements before claiming full provider integration

- At least one bounded, objectively graded native process result per provider, separately classified from production qualification. A harmless runtime smoke can run without inventing a qualified binding, but cannot make that candidate production-eligible.
- If missing qualification blocks delegation, validate/render synthetic configs in clearly nonproduction adapter-test mode and report no production binding. Do not silently set synthetic=false to make a live smoke run.
- Parse native completion subtype/event, not exit code alone. Capture auth errors, unavailable model, timeout, malformed/truncated stream, reroute, mixed-model usage and absent telemetry with explicit status.
- Claude result cost fields are estimates; preserve pricing provenance and modelUsage across the agent tree. Codex CLI turn usage does not itself prove billed dollars or served snapshot. Never infer actual served model solely from requested argv or substitute missing cost with zero.
- Claims such as unknown served identity block acceptance imply Codex CLI may stay blocked even when a request completes; report the distinction between runtime exercised and governance acceptance. Do not fabricate telemetry to satisfy a stronger contract.
- Check three distinct outcomes: native syntax conformance, live runtime execution, and production-governance acceptance. None is a substitute for the others.

Primary references are already collected in docs/runtime-contracts.md; fresh local help confirms the flags above. No paid calls or authentication checks were performed in this review.
