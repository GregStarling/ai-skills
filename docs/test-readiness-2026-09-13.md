# Test-readiness changes — 2026-09-13

Purpose: make Delegate measurable in the regime where the user expects value, long real sessions
with a Sonnet coordinator escalating to Fable on Claude Code, or Terra to Astra on Codex. The earlier
paired trials measured one-to-four-minute fixture tasks, where fixed coordination overhead dominates
and delegation lost every pair. Those results stand for that regime and are unchanged.

## Why these four changes

Local transcripts on the maintainer's machine (July to September 2026, priced at list rates as a
proxy) showed where the cost actually sits:

| Component | Share |
| --- | --- |
| Cache reads | 67% |
| Cache writes | 23% |
| Output, thinking included | 9% |
| Main session versus subagents | 71% / 29% |

Two facts follow. First, the coordinator's per-token price on re-read context is the lever, which
favors an economical coordinator in long sessions. Second, on Claude the frontier's cache reads are
cheap ($0.25/MTok on Fable 5.1) while a fresh reviewer's cache writes are expensive ($20/MTok at the
one-hour TTL Claude Code uses), so a mandatory fresh Fable review after every implemented change
can consume most of the saving from a Sonnet coordinator.

1. **Review tiered by declared risk.** `reviewRequirement` in the helper now requires fresh frontier review for implemented behavior only at medium risk and above, for hard-bug fixes and implementations of consequential decisions at any risk, for explicitly requested independent review, and for a stable 10% sample of low-risk tasks keyed to the task ID. Declared low risk otherwise completes on coordinator checks. Unknown risk is medium. Research, decision-only work and simple-work audits are unchanged.
2. **Recording protocol made optional.** The coordinator previously ran `dispatch` at intake and on signal changes, `dispatch` again for the review decision, `artifacts`, evidence-file hashing and a 20-field `complete` payload. Trials showed coordinators misnaming the host and omitting the observation, and the payload's `usage` field is always null because the model cannot see its own tokens. Usage now comes from the host transcripts through `scripts/measure-usage.mjs`. The helper commands remain for unclear cases and explicit evaluations.
3. **Skill text cut to about a page.** SKILL.md went from about 1,600 words to about 940, the Claude host guide from about 680 to about 330. The learning reference is no longer mandatory reading. Supporting docs remain as optional reads and stay reachable for the packaging check.
4. **CLAUDE.md activation path.** `skills/delegate/hosts/claude-md-snippet.md` restates the rules in about 300 tokens for a user's global CLAUDE.md during a test period, because automatic skill discovery on Claude Code was never verified in the earlier checklists.

## What did not change

The routing pack, the evidence-required `route` path, the engine under `src/`, historical evidence
folders and dated reports, and the review rule for research, decisions and mechanical audits. No
personal installation or saved-model change was made; those remain the user's action.

## Test protocol

1. Set Sonnet as the saved Claude Code model. Copy `skills/delegate` to `~/.claude/skills/delegate`. Optionally append the snippet to `~/.claude/CLAUDE.md`.
2. Work normally for two weeks. Do not name the skill or ask for agents; declare risk when implementing.
3. Run `node scripts/measure-usage.mjs --since <start date>` and compare the Sonnet-coordinated rows against the Fable history on cost per user turn, cost per session, edits per user turn and subagent share.
4. Treat the result as a real-world comparison, not qualification. Quality signals to watch: rework turns, reverted commits, and how often low-risk work was misdeclared.

## Verification of this revision

Run locally on 2026-09-13 with Node 22 and Claude Code 2.1.259 present:

| Check | Result |
| --- | --- |
| `npm test` | 49 files, 888 passed, 3 skipped, 0 failed |
| `npm run typecheck` | passed |
| `npm run build` | passed |
| `node scripts/verify/skills.mjs` | passed; 15 consumer files, references closed, guard sentences present |
| Routing-pack publication check (CI step) | VALID, pack `sha256:ebda991b…` unchanged |
| Helper `dispatch` matrix | low-risk fix → direct with coordinator checks; medium → frontier review; high → frontier review; hard-bug fix at low → frontier review; low + independent review → frontier; stable 10% sample → frontier audit |
| `scripts/measure-usage.mjs --since 2026-09-01` | 55 sessions priced, 0 unpriced models, 0 TTL assumptions |

Consumer folder digest `sha256:3680fd617905a2ff8165d799d79f5c6204d5663859a41e816effa3d3074727b5`; guidance digest without the pack `sha256:4f299777edcd3db7bb930da5d91503d0fd783518a79d821704bd340a1c2ba64d`.
Mandatory reading for a Claude Code coordinator (SKILL.md plus the host guide) is about 2,200 tokens by a bytes/4 estimate, down from about 9,100 when the learning reference was required. The CLAUDE.md block is about 380 tokens.

One pre-existing flake was fixed in passing: the cheaper-completion proof test builds many temporary fixtures and exceeded the default 5-second budget under a parallel full run; it now declares a 30-second budget.

Nothing was installed and no saved model changed. The Sonnet-coordinator configuration remains untested live on Claude Code; that is what the test protocol above is for.
