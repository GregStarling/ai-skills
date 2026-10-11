# Delegate renewal results — 2026-10-11

Greg authorized the Delegate model-currency workstream on 2026-10-11 ("work through this entire workstream, use /cto mode and /ship when complete"), following a live look that found the routing pack's Claude treatments on legacy models and a newer GPT-6.1 Sol in Codex. The campaign reused the October ceiling of 62 model executions. The renewal attempted all 14 installed cases: **all 14 passed trace-bound maintainer review**. All six observed treatments have fresh smoke evidence and official availability/pricing citations; Fable 5.1 was recalibrated as the additional Claude mechanical reviewer. These observations grant no qualification. The plan, decisions and evidence trail are in [the checklist](../.checklists/delegate-model-currency-2026-10.md).

## Treatment replacement

Official model pages preserved at 2026-10-11T21:46:04Z list Claude Opus 5, Sonnet 5 and Haiku 4.5 as legacy, with Opus 5.5, Sonnet 5.5 and Haiku 5.5 current, and list GPT-6.1 Sol at $2/$10 per million tokens. The GPT-6 Sol model page (https://developers.openai.com/api/docs/models/gpt-6-sol, fetched between 21:41Z and 21:43Z and not among the preserved pages) gives the same input and output price and says it is "superseded by GPT-6.1 Sol". Claude Code 2.1.296 serves Haiku 5.5 for the `haiku` alias (it requires 2.1.293), and codex-cli 0.162.1 lists `gpt-6.1-sol`.

| Smoke pair | Worker | Reviewer |
| --- | --- | --- |
| `claude` | `claude-sonnet-5-5`, low (was `claude-sonnet-5`) | `claude-opus-5-5`, high (was `claude-opus-5`) |
| `claude-haiku` | `claude-haiku-5-5`, no effort requested (was `claude-haiku-4-5-20251001`) | `claude-opus-5-5`, high |
| `codex` | `gpt-6-luna`, low (renewed) | `gpt-6-astra`, high (renewed) |
| `codex-standard` | `gpt-6.1-sol`, low (was `gpt-6-sol`) | `gpt-6-astra`, high |

The installed Claude coordinator, capacity preflight and frontier probe reviewer moved from `claude-opus-5` to `claude-opus-5-5`; the Codex coordinator stays `gpt-6-astra`. Fable 5.1 and Astra remain each provider's frontier target; Claude Mythos 5.1 is offered only through the Cyber Verification Program with no Claude Code alias and is not routed.

Haiku 5.5 supports adaptive-thinking effort, but neither the smoke launch nor the Claude Code Agent tool requests one, so its treatment records effort `not_applicable` (no effort requested) with an explicit control limitation; that keeps the Agent-tool acceptance workers bound to it.

## Installed acceptance

| Host | Case | Acceptance | Worker (served or configured) | Execution attempts | Failed launches |
| --- | --- | --- | --- | --- | --- |
| claude | tinybug | PASS | claude-haiku-5-5 | 2 | 0 |
| claude | mechanical | PASS | claude-haiku-5-5 | 2 | 0 |
| claude | backend | PASS | claude-haiku-5-5 | 2 | 0 |
| claude | ui | PASS | claude-haiku-5-5 | 2 | 0 |
| claude | hardbug | PASS | claude-haiku-5-5 | 2 | 0 |
| claude | multicomponent | PASS | claude-haiku-5-5 | 2 | 0 |
| claude | fullproject | PASS | claude-haiku-5-5, claude-haiku-5-5 | 3 | 0 |
| codex | tinybug | PASS | gpt-6-luna/low | 2 | 0 |
| codex | mechanical | PASS | gpt-6-luna/low | 2 | 0 |
| codex | backend | PASS | gpt-6-luna/low | 2 | 0 |
| codex | ui | PASS | gpt-6-luna/low | 2 | 0 |
| codex | hardbug | PASS | gpt-6-luna/low | 2 | 0 |
| codex | multicomponent | PASS | gpt-6-luna/low | 2 | 0 |
| codex | fullproject | PASS | gpt-6-luna/low, gpt-6-luna/low | 3 | 0 |

Each passing case binds the external grader result, saved artifact hashes, the coordinator's final per-artifact inspection tool IDs, worker identity and written files, and matched raw receipt bytes. Claude workers ran through the Agent tool (`haiku` alias); their served model comes from forwarded child message models and their edits from forwarded child Edit/Write events. Codex workers ran as native child sessions; their configured model and effort come from preserved native `turn_context` records and their edits from preserved child patch events, except the Codex tinybug worker, which wrote `quantity.mjs` with `python3` `Path.write_text` inside Codex 0.162's JS `exec` tool; the maintainer collector was extended to attribute that form, and the preserved call shows it completed. Served Codex identity and effort are not exposed. Both UI artifacts were rendered at 320 and 1280 pixels with the existing Playwright capture, and the maintainer viewed both screenshots and the DOM checks. Whole-project cases test decomposition and integration; they never create a whole-project worker route.

The [evidence index](evidence/delegate-renewal-2026-10-11/evidence.json) preserves all 14 results, the four smokes, the frontier probe review, calibration, the archive record and the complete execution ledger.

## Accounting and freshness

The campaign used **46/62 model executions**, with zero reservations outstanding and no halts or provider stops: 2 frontier probes and 1 independent probe review, 2 capacity preflights (Claude Opus 5.5 and Codex Astra, low effort), 4 for the Fable calibration (one Haiku 5.5 worker reused byte-identically as the Haiku smoke worker, three Fable reviews), 7 smoke executions and 30 for the installed cases. No smoke review needed a retry. Host token counters and list-price estimates are not subscription spending.

Official metadata was captured at 2026-10-11T21:46:04.000Z. Frontier probes ran on codex-cli 0.162.1 and Claude Code 2.1.296; a fresh Opus 5.5/high review passed both diagnoses. The October canonical inputs moved byte-identically to `data/routing/archive/2026-10-09/` with [a preservation record](../data/routing/archive/2026-10-09/preservation.json).

## Consumer provenance

Installed acceptance ran on consumer folder `sha256:beba70c31427f5e3e2bf08475ad011af4a00d3fb5a6c634dd0427302c0c9caf4` with intermediate pack `sha256:6e135a0c0a70503b922ccc58c89c77e9d9019f814aeb91fe34aaf08fbaf2e0a1`. That pack was compiled from the fresh smokes with an acceptance placeholder holding no records: the archived October records match the unchanged Luna and Astra treatments, and their 2026-10-09 dates would have bound entry expiry below the publication guard. Every entry in the intermediate pack was therefore smoke extrapolation, as in October. Publication recompiles with the new records: pack `sha256:37377985353aaa510aa7ebd65593e1f2fe254d4f50c5d8106333d5b3b09efa1d`, complete folder `sha256:3df782b9d08c5b9290d8cac996646ecd7765bb06f9a5f47338f3664585884a2e`, guidance `sha256:60621a18349acd41001557330dcddf9b8a63cb3485b7769fad42715c2a7c9ecd`. The guidance differs from the acceptance folder's by three documentation edits made after the frontier review: the `finish` example in `local-learning.md` names `claude-sonnet-5-5` and `claude-haiku-5-5`, the Roles fallback line says to coordinate on `gpt-6-sol` with `gpt-6-luna` workers, and `hosts/claude-code.md` says how to record a routed Haiku worker's effort. The helper, host launch controls and pack bindings are unchanged by them. Installed acceptance now supports the Haiku 5.5 and Luna workers and the Opus 5.5 and Astra reviewers for mechanical_work (low risk), bounded_implementation, ui_implementation, hard_debugging and complex_implementation on their hosts; repo_exploration, research and the Claude medium-risk mechanical_work route (with its medium audit) remain smoke extrapolation, and Sonnet 5.5 and GPT-6.1 Sol workers remain smoke extrapolation everywhere because no acceptance case selected them. The route scope is unchanged: 15 routes, one medium (Claude mechanical_work), no qualified entries. The pack expires 2026-11-10T22:22:43.174Z.

## Limitations

- GPT-6 Sol was not re-observed. Accounts without GPT-6.1 Sol keep the Luna worker and Astra reviewer routes, and the Roles table names `gpt-6-sol` as their coordinator fallback.
- Haiku 5.5 list price rises from $0.10/$0.50 to $0.50/$2.50 per million tokens for a request whose prompt exceeds 100,000 tokens; observations record the lower tier.
- Codex per-execution USD cost is unknown (plan credits). Claude rates are API list prices, not subscription bills. No savings are claimed.
- Both full-project coordinators wrote `app.mjs` themselves during integration, as the task directs.
- Haiku 5.5's `not_applicable` effort means no effort was requested, not that the model lacks effort, yet identity assurance treats `not_applicable` like runtime-attested. The smoke ran at the host default (the inherited `CLAUDE_CODE_EFFORT_LEVEL` was stripped); the acceptance Agent-tool workers ran under an `--effort high` coordinator, and whether they inherited that effort is unknown. Both share one treatment identity. This is harmless while every entry is provisional; a guard is needed before such evidence could qualify a route.
- The `data/routing/frontier-targets.json` Codex claim says GPT-6.1 Sol "supersedes GPT-6 Sol" while citing the Codex models page; that wording comes from the GPT-6 Sol model page. The targets file is bound by digest into the probe report, so the claim was not edited after probing.
- The maintainer collector attributes a `python3` write only to the `Path` that receives `.write_text(`; the first proposals attributed every `Path` in such a call, and the Codex worker label is now "preserved child patch, shell heredoc or python write_text events". Proposals, final reviews, acceptance, pack and index were regenerated from the corrected collector; only the Codex label changed, and the superseded outputs are kept under `artifacts/renewal-2026-10-11/superseded-before-review-repair/`.
- Raw artifacts remain local under `artifacts/renewal-2026-10-11/` (gitignored); committed files bind their digests.
