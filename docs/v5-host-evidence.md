# V5 native host evidence

The starting clients reported **Claude Code 2.1.267** and **Codex CLI 0.154.0**. No client, global skill, or global provider configuration was changed by this work.

The user-supplied upgraded-host probe report is preserved byte-for-byte in `data/routing/frontier-probes-pre-v5.json`. `data/routing/v5-frontier-history.json` records its hash and the original request, trace, summary, and fixture hashes. Original traces under `artifacts/frontier-probes/1789023432180/` remain unchanged. A fresh Opus 5 / high process inspected both original traces and fixtures, executed the failing tests, and independently passed both diagnoses. Its actual review artifact is retained at `artifacts/frontier-probes/1789023432180/independent-review/`; the review's canonical digest is `sha256:e7a41b9c422aa397ef71e2bd722b78a7c485a173df9a410dd7908eba67395bfe`.

## Native identity capture

`executeFrontier` uses the existing `runProcess` and `nativeEnvironment` functions. Before the process starts it records the exact environment, candidate identity, executable, argv, working directory, prompt digest and configuration file digests. The environment capture identifies the complete set of material model/provider overrides without recording credentials or endpoint values. The process capture then binds actual lifetime, exit/signal/timeout, and exact stdout/stderr bytes. Raw version-command output is retained separately.

The shared `deriveIdentityAssurance` validator parses these bytes. `frontier_probes.v2` contains its compact result, plus a reference to the full captured source bundle in `data/routing/frontier-identity-evidence.json`. Publication preflight resolves the reference, verifies the raw source digests, independently re-derives assurance, and compares the host, candidate, configuration, version and observed identity. A writable assurance label, missing source, changed argv, or invented observed model fails publication.

The final capture distinguishes:

| Host treatment | Configured model / effort | Observed model / effort | Derived assurance |
| --- | --- | --- | --- |
| Claude Fable 5.1 / high | `claude-fable-5-1` / `high` | `claude-fable-5-1` / absent | `PARTIALLY_RUNTIME_ATTESTED` |
| Codex Astra / high | `gpt-6-astra` / `high` | absent / absent | `CONFIGURATION_ATTESTED` |

Claude's auxiliary model-usage rows do not establish primary treatment substitution. Neither thinking tokens nor list-cost telemetry attests effort or a subscription bill. No host fallback was configured; provider-side fallback remains independently unobserved.

## Honest intermediate failures

The captures made while the contract was being hardened remain intact. They are not retroactively supplied with missing environment evidence.

- The first local reviewer verdict parser rejected `CODEX: PASS.` and `**ACCEPT**` because it assumed bare tokens. The parser was corrected to accept ordinary punctuation and Markdown; the original outputs remain intact.
- A Fable diagnostic attempt used an absolute test path that did not match an overly narrow harness allowlist. It did not execute the failing test. Independent review correctly returned **FAIL**, even though the diagnosis was correct. The final disposable-fixture harness permits Read/Bash and verifies both fixture files are unchanged; it no longer depends on one spelling of the test command.
- Earlier reviewer attempts recovered from rejected commands containing a directory listing by executing the allowed test command alone. The successful actual test events, rather than the attempted command, establish task acceptance.
- Initial captures did not record the complete material child environment. Their raw traces were retained, and a new capture was executed after the validator required that evidence. No original request was rewritten to claim controls it did not capture.

These are harness and evidence-contract recoveries, not additional independent model-performance samples.

## Frontier roles and qualification

Both new frontiers additionally reviewed the existing corrected quantity-default artifact in fresh artifact-only processes. They read the source and tests, executed a passing test, and returned ACCEPT. The artifact digest remains `sha256:1984b836f65f116d463a795cd90b4bf2291a6180725eff56b1d8212e173cfb58`.

Those reviewer executions predate the final required complete environment capture. `data/routing/frontier-reviewer-evaluations.json` preserves their real task results and explicitly records the current validator result as `UNVERIFIED` and admission as `not_admitted`. They cannot establish configuration-attested reviewer authority. Neither model is inserted into every route because it is newer. Existing narrow medium authority remains unchanged.

An availability diagnosis is not twenty independent class-specific worker tasks, and an ACCEPT on one artifact is not a qualified reviewer ledger. The final probe evidence makes exact subscription identity reachable under v5; actual qualification still requires the unchanged task, review, latency, failure and freshness thresholds. API-equivalent economics remain separate.

## Final executed proof

Final raw capture: `artifacts/frontier-probes/1789024794210/`. Both clients still reported the starting versions at the end of this work: Claude Code 2.1.267 and Codex CLI 0.154.0.

| Evidence | SHA-256 |
| --- | --- |
| Codex Astra probe stdout | `6ec05fc9e66920e4991f8220a51b16b91eb9e4ae418e98734aa616b3edaebb7a` |
| Claude Fable probe stdout | `2edf2c59cbfae8698868ab032a61cec997ca63889f3ec7ceef52669a707d2ed5` |
| Fresh independent reviewer stdout | `abbb7408a1a0016c1523e08f3758795cb1932f28f15e7b8a805a1353416bdc67` |
| Canonical bound review artifact | `392f983b7d03a26698dae5f9d92a10a6f8e5653a09f5021376c9e844fd85cc94` |

The independent Opus 5 / high review **passed both probes**, read the actual complete source/test/trace files, reran both failing tests, and checked the proposed nullish fix in memory without editing files. The current active probe report references the bound review artifact in `data/routing/frontier-probe-reviews.json`. Its binding includes separate hashes for the actual diagnosis text, probe trace, fixture, review manifest, review request, and reviewer trace. The original `review.json` and raw trace were preserved unchanged.

The built frontier publication preflight passed against the current checked raw source bundle and reviewed report. Five focused frontier-refresh tests passed, including forged assurance, changed/missing sources, configured-versus-observed identity, and invented client versions. All four touched maintainer scripts passed Node syntax checks. These checks do not grant a qualified worker or reviewer route.
