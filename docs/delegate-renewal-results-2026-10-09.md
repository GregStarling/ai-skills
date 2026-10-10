# Delegate renewal results — 2026-10-09

Greg approved a full renewal of the existing provisional route scope with a ceiling of 62 model executions ("option 3"). The renewal attempted all 14 installed cases: **all 14 passed trace-bound maintainer review**. All six treatments have fresh smoke evidence and official availability/pricing citations; Fable was recalibrated as the additional Claude mechanical reviewer. These observations grant no qualification.

## Codex treatment replacement

Official Codex model guidance fetched on 2026-10-09 records that `gpt-5.3-codex-spark` retired on 2026-09-14 and that `gpt-5.5` leaves Codex with ChatGPT sign-in on 2026-10-14. Renewing either treatment would publish 30-day routes for models that are gone or nearly gone, so the Codex smoke pairs were replaced:

| Smoke pair | Worker | Reviewer |
| --- | --- | --- |
| `codex` | `gpt-6-luna`, low (was `gpt-5.3-codex-spark`, low) | `gpt-6-astra`, high (was `gpt-5.5`, high) |
| `codex-standard` | `gpt-6-sol`, low (was `gpt-5.5`, low) | `gpt-6-astra`, high |

The installed Codex coordinator and capacity preflight moved from `gpt-5.5` to `gpt-6-astra`, matching the frontier reviewer treatment whose verification the acceptance records bind. Astra was previously admitted only as an additional mechanical reviewer; it is now the primary Codex reviewer, so that admission is not repeated. Anthropic still lists `claude-opus-5`, `claude-sonnet-5` and `claude-haiku-4-5-20251001` as active, so the Claude treatments are unchanged. Fable 5.1 and Astra remain each provider's current frontier.

## Installed acceptance

| Host | Case | Acceptance | Worker (served or configured) | Execution attempts | Failed launches |
| --- | --- | --- | --- | --- | --- |
| claude | tinybug | PASS | claude-haiku-4-5-20251001 | 2 | 0 |
| claude | mechanical | PASS | claude-haiku-4-5-20251001 | 2 | 0 |
| claude | backend | PASS | claude-haiku-4-5-20251001 | 2 | 0 |
| claude | ui | PASS | claude-haiku-4-5-20251001 | 2 | 0 |
| claude | hardbug | PASS | claude-haiku-4-5-20251001 | 2 | 0 |
| claude | multicomponent | PASS | claude-haiku-4-5-20251001 | 2 | 0 |
| claude | fullproject | PASS | claude-haiku-4-5-20251001, claude-haiku-4-5-20251001 | 3 | 0 |
| codex | tinybug | PASS | gpt-6-luna/low | 2 | 0 |
| codex | mechanical | PASS | gpt-6-luna/low | 2 | 0 |
| codex | backend | PASS | gpt-6-luna/low | 2 | 0 |
| codex | ui | PASS | gpt-6-luna/low | 2 | 0 |
| codex | hardbug | PASS | gpt-6-luna/low | 2 | 0 |
| codex | multicomponent | PASS | gpt-6-luna/low | 2 | 0 |
| codex | fullproject | PASS | gpt-6-luna/low, gpt-6-luna/low | 3 | 0 |

Each passing case binds the external grader result, saved artifact hashes, the coordinator's final per-artifact inspection tool IDs, worker identity and written files, and matched raw receipt bytes. Claude workers ran through the Agent tool (`haiku` alias); their served model comes from forwarded child message models and their edits from forwarded child Edit/Write events. Codex workers ran as native child sessions; their configured model and effort come from preserved native `turn_context` records and their edits from preserved child patch events (two child writes used a shell heredoc instead: `search.mjs` in the Codex hardbug case and `store.mjs` in the Codex full-project case). Served Codex identity and effort are not exposed. Both UI artifacts were rendered at 320 and 1280 pixels with the existing Playwright capture, and the maintainer inspected both screenshots and the DOM checks. Whole-project cases test decomposition and integration; they never create a whole-project worker route.

The [evidence index](evidence/delegate-renewal-2026-10-09/evidence.json) preserves all 14 results, the smokes (including two rejected first attempts), the frontier probe review, calibration, the archive record and the complete execution ledger.

## Accounting and freshness

The campaign used **49/62 model executions**, with zero reservations outstanding and no halts or provider stops: 2 frontier probes and 1 independent probe review, 2 capacity preflights (Claude Opus 5 and Codex Astra, low effort), 4 for the Fable calibration (one Haiku worker reused byte-identically as the Haiku smoke worker, three Fable reviews), 10 smoke executions and 30 for the installed cases. The smoke total includes the rejected first attempts and their retries (two for the Claude pair, one reviewer for the Haiku pair). Host token counters and list-price estimates are not subscription spending.

Official metadata was captured at 2026-10-09T23:43:58.000Z. Frontier probes ran on Codex CLI 0.156.1 and Claude Code 2.1.292; a fresh Opus 5/high review passed both diagnoses. Two first-attempt Claude smoke reviews gave correct ACCEPT verdicts but not as the first token the unchanged assembler requires; both are counted and preserved, and the smoke reviewer prompt now asks the reviewer to begin with the verdict word. The September canonical inputs moved byte-identically to `data/routing/archive/2026-09-11/` with [a preservation record](../data/routing/archive/2026-09-11/preservation.json).

## Consumer provenance

Installed acceptance ran on consumer folder `sha256:04e3edbeac507502bdedbd31a491ceb457d10c418edf719d23dc2a8b4ec408d5` with intermediate pack `sha256:357665d4cb2b96d15de765741fa54792917db4f0bf5c6034688b5238aa9d1a90`, compiled from the fresh smokes with the archived September acceptance file (`sha256:ca5df227…`) in the canonical acceptance path as a placeholder; no September record matched a renewed treatment, so every entry in that pack was smoke extrapolation. Publication recompiles with those records: pack `sha256:348739dd236a4e9690061edfd4c7e70c25ac1cb88cb46f77cb7695fe1f7fb260`, complete folder `sha256:76a6864a9d3073b70dff532a3a97cc0303f7f03e5875e4a68fa8178631fafc74`. Guidance bytes are unchanged (`sha256:0af2ee5f1902a48c11b15377c1fc6c3fd988333cd3937790e77325a7d96b1f86`). Installed acceptance now supports the Haiku and Luna workers and the Opus and Astra reviewers for mechanical_work (low risk), bounded_implementation, ui_implementation, hard_debugging and complex_implementation on their hosts; repo_exploration, research and the Claude medium-risk mechanical_work route (with its medium audit) remain smoke extrapolation, and Sonnet/Sol workers remain smoke extrapolation everywhere because no acceptance case selected them. The route scope is unchanged: 15 routes, one medium (Claude mechanical_work), no qualified entries.

## Limitations

- The Claude 5.5 generation (Opus 5.5, Sonnet 5.5, Haiku 5.5) and GPT-6.1 Sol were not evaluated. Claude Code's `opus`, `sonnet` and `haiku` aliases may serve newer models than the pack's Claude treatments; the consumer intersects the pack with what the host actually serves.
- Haiku 4.5 can retire no sooner than 2026-10-15, inside the entry window; consumers skip unavailable treatments.
- Codex per-execution USD cost is unknown (plan credits). Claude rates are API list prices, not subscription bills. No savings are claimed.
- The Claude multicomponent artifact also rejects whitespace-only task ids, stricter than the specified nonempty-string requirement; the grader does not exercise that input. Both full-project coordinators wrote `app.mjs` themselves during integration.
- Raw artifacts remain local under `artifacts/renewal-2026-10-09/` (gitignored); committed files bind their digests.
