# Lightweight checks with preserved review

## Approved implementation plan

Build on GitHub revision `629cc28` locally. Keep its shorter instructions, risk-tiered review, and optional detailed recording. Add one mandatory lightweight review check and preserve the original classification through implementation handoffs. No personal installation, saved-model change, or remote publication is included.

1. Reuse the existing helper's classification, deterministic audit, and shared review policy in a stateless `check` command. It needs a stable task ID and assignment, with optional work type, risk and review flags. Omitted/unknown risk means medium.
2. Carry `origin_work_type` through handoffs and repairs. Consequential decisions and hard bugs keep fresh frontier review; missing or unknown origins on approved execution/plan implementation require review. A known planning-only origin can follow the normal risk tier.
3. Require one intake check, repeated only when inputs change. Keep the original ID and consult the result before delivery. Ordinary work needs no evidence hashing or completion ledger; full dispatch and completion remain available for explicit evaluations.
4. Test the shared policy, CLI isolation, handoff persistence and full completion guard. Run the existing repository checks and obtain independent review.

## Scope and limits

The check selects the reviewer; it does not run the reviewer, establish completion, or override execution/escalation rules. Models still classify the work and must preserve the task ID and consequential/hard-bug origin in the conversation and worker packets. Stateless checks do not prevent a caller from lying about risk or changing the ID; the instructions forbid doing so. A new consequential finding upgrades the origin, and a required review must not be removed by relabeling the assignment.

The 10% audit rate is a trial setting. The existing usage script reads Claude Code transcripts and reports API-price proxies; it does not measure Codex consumption, successful completion, quality equivalence or savings. A future evaluation should compare matched work and include acceptance, meaningful audit findings, and all repair/rework effort. No live provider evaluation was run for this local change.

## Validation

- Full suite: 49 files, 915 tests passed.
- Policy/CLI coverage includes stable sampling, inherited review, missing origins, stateless execution, malformed arrays, and strict optional completion. The independent review found non-string assignment/origin coercion; both cases now have regression coverage.
- Typecheck and build: passed.
- Portable skill structure, reference closure, inert source and current folder digest: passed.
- Published routing pack validation and built CLI help: passed; pack bytes unchanged.
- Independent final review is required before delivery; its receipt is retained with the local task evidence.

The standalone Skill Creator Python validator could not run because PyYAML is absent in the available Python runtimes. The repository's existing Node/YAML packaging validator passed. No dependency was installed for this auxiliary check. Historical evidence remains unchanged.
