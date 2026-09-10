# V4 host evidence assessment

Assessed on 2026-09-10 from the existing raw native traces and [host observations](../data/routing/host-observations.json). No models were called, clients upgraded, source observations redated, or historical evidence rewritten for this assessment.

## Scoped medium-risk authority

The Claude quantity-default smoke demonstrates the three medium-risk controls: **different actual model, fresh review context, and frontier verification of the artifact**. It supports one provisional `mechanical_work` scope: summing supplied quantities while preserving explicit zero, defaulting only null/undefined to one, and returning zero for empty input. Its task-evidence basis remains `smoke_extrapolation`; this is neither governor qualification nor evidence for arbitrary medium-risk mechanical work.

| Original run | Worker | Separate reviewer | Evidence |
| --- | --- | --- | --- |
| `claude-1789006044123` | Observed `claude-sonnet-5`, configured low | Observed `claude-opus-5`, configured high | Read implementation `toolu_01DVNPZN9XpPNgZv3VLRixgj`, read tests `toolu_01D1vWhcD5fN1YWGFkN1na9g`, ran tests `toolu_01WLrAiv5Su3BAqWvKs5Hv1z`, returned ACCEPT |
| `claude-haiku-1789006119985` | Observed `claude-haiku-4-5-20251001`, effort not applicable | Observed `claude-opus-5`, configured high | Read implementation `toolu_01WoGTNbXPgmHF31RYA154kg`, read tests `toolu_01LQtgz4vDFPfxDqjoGAavm9`, ran tests `toolu_014mmkrwDKfTwSgcLfiVhppZ`, returned ACCEPT |

Both reviewers started new `claude -p` processes with `--no-session-persistence`, isolated setting sources and MCP configuration. Their prompt supplied the requirement and instructions to inspect `quantity.mjs`, inspect tests and execute `node --test quantity.test.mjs`; it did not include the worker's report or transcript. They did not resume a worker session. A subsequent medium-risk dispatch must retain this fresh artifact-only review boundary; coordinator self-review is insufficient.

The raw reviewer request and output files remain under `artifacts/portable-host-evidence/<run>/reviewer/`. These ignored local artifacts are identified by hashes in addition to the checked-in run summaries:

| Run | Reviewer request SHA-256 | Reviewer output SHA-256 |
| --- | --- | --- |
| Sonnet run | `d2b05c31d67ad1b7840e3c5f0e522157bfbabb551592520ea2788c59ab2e906f` | `2dd28c2a5242ef5a496917d660f754507493507e44fb99bed57f89de1f2a949e` |
| Haiku run | `c2d588d728ef2fbd7524f6588cdfba33cfffc4620655c0bd8b9ec659b601ac5b` | `63a9d1892694f904f55826ccdb5575289b795c79dbfcf3f317b038705f0c73bc` |

The derived [medium smoke audit](../data/routing/medium-smoke-audit.json) binds these review facts to the canonical digest of the original observation source, each complete run record and the exact treatment identities. Both reviewed artifacts have digest `sha256:1984b836f65f116d463a795cd90b4bf2291a6180725eff56b1d8212e173cfb58`. Source timestamps remain the original September 10 observations. Served effort is not attested; Sonnet low and Opus high are configured controls. Haiku had no effort flag. Subscription charges and provider-side rerouting remain unobserved.

The other evidence does not expand this scope:

- Codex Spark→GPT-5.5 used a fresh artifact-only reviewer, but model and effort identity are configuration evidence only; the event stream lacks served identity. No medium route is added from that pair.
- GPT-5.5 low→GPT-5.5 high uses the same model, so it fails the different-model requirement even with a fresh process.
- The [installed acceptance matrix](../data/routing/installed-acceptance.json) covers local low-risk fixtures. Its coordinators generally review in the context that planned work and received worker output. It does not establish a fresh reviewer for broader medium classes. Assisted UI recovery is not independent medium-risk review evidence.
- High and critical lack the required risk-appropriate cross-family/fresh-context proof and remain blocked.

## Unavailable frontier identity

The shared telemetry parser and probe harness now reject synthetic placeholders and error-envelope model echoes. A failed result's auxiliary `modelUsage` entries cannot establish requested-model execution. Real assistant identities observed before a later error remain evidence.

Offline replay of the original Fable probe now yields `observed_models: []` and preserves its exact error:

> API Error: 400 Claude Code 2.1.222 does not support this model; version 2.1.251 or newer is required. Run 'claude update', or update the Claude desktop app, then try again.

The original stdout SHA-256 remains `ef5ac46d3d76c491493602712f8fa236cb010a60fd2332bce5af594fdc93643d`. The historical [frontier probe file](../data/routing/frontier-probes.json), including its old derived placeholder, is preserved; new probes use the corrected parser. Regression tests cover placeholders, exact errors, auxiliary usage on failure and valid surrounding identities.

Operational follow-up requires explicit authorization to upgrade Claude Code and Codex. Then rerun frontier discovery, rerun probes, evaluate each newly available frontier, and recompile through the normal routing refresh workflow. The old probes remain the evidence until replaced by that workflow.

## API-equivalent pricing categories

Official documentation checked 2026-09-10 supports the following normalization; it does not establish subscription billing or replace historical price-source dates.

- **OpenAI:** `input_tokens` includes cached reads and writes. Subtract `input_tokens_details.cached_tokens` and `input_tokens_details.cache_write_tokens` to obtain ordinary input. Separately billed cache writes apply to current GPT-5.6-and-later families, not older-model pricing by assumption. `output_tokens` already includes reasoning tokens. Use the applicable model, context, tier and regional price categories. [Prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching), [pricing](https://developers.openai.com/api/docs/pricing).
- **Anthropic:** `input_tokens` is uncached input; reads are `cache_read_input_tokens` and writes are `cache_creation_input_tokens`. The write total may split into `cache_creation.ephemeral_5m_input_tokens` and `ephemeral_1h_input_tokens`. Price either the known aggregate category or its TTL subdivisions, never both. Cache rates have model-specific exceptions. Output thinking is a subdivision of `output_tokens`, not extra output. [Prompt caching](https://platform.claude.com/docs/en/build-with-claude/prompt-caching), [pricing](https://platform.claude.com/docs/en/about-claude/pricing), [message usage](https://platform.claude.com/docs/en/api/cli/beta/messages/create).

Unmatched cache-write TTLs, unavailable category rates, or unsupported pricing modifiers remain unknown. A token-cost proxy must identify excluded tool fees; neither raw token counts nor client cost estimates establish actual subscription charges.
