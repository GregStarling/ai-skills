# Delegate

## Coordinate Cheaply. Bring in Frontier When It Matters.

Delegate keeps a capable, economical model in charge of the conversation. It does routine work directly and automatically brings in frontier agents for planning, consequential decisions, difficult bugs, and reviews of implemented behavior.

The coordinator classifies the request, applies a prescribed routing rule, and records the reason. Execution and review are separate decisions. Research and PDF analysis stay economical, even when the documents are long or the sources disagree.

| Host | Starting coordinator | Frontier agents |
| --- | --- | --- |
| Codex | Terra · medium reasoning | Astra · high reasoning |
| Claude Code | Sonnet | Fable · supported effort controls |

The parent conversation keeps its model. Agents receive bounded assignments, return their results, and the coordinator continues. Routine launches need no extra confirmation within the user's existing permissions. Explicit model choices and restrictions on delegation take precedence; unavailable models or quota limits are reported as blockers.

These are the intended host settings. Installing the skill does not change saved models or switch an existing session.

## The Architecture

[![Delegate architecture: economical coordinator, prescribed frontier assignments, independent review, and validated completion](docs/delegate-system.png)](docs/delegate-system.html)

[Open the interactive map](docs/delegate-system.html) · [Editable Archify source](docs/delegate-system.architecture.json)

The main path stays with the economical coordinator. Frontier assignments and independent reviews branch from that path only when their rules apply. The `complete` operation validates artifacts, checks, identities, and required review, then persists one accepted observation before reporting completion. A routing decision alone is not completed work.

## What Goes Where

| Work | Execution | Verification |
| --- | --- | --- |
| Create or materially revise a plan | Frontier | Evidence, constraints, and acceptance checks; no second frontier call just for producing a plan |
| Critical UI/UX, architecture, security, migration, or public-contract decisions | Frontier decides; settled implementation can return to the coordinator | Fresh frontier review of implemented behavior |
| Hard bugs, races, unexplained failures, or uncertain root causes | Frontier by default | Fresh frontier review of behavior-changing fixes |
| Features, understood fixes, and substantial refactors | Economical coordinator or bounded workers | Fresh frontier review every time |
| Research, source comparison, synthesis, and PDF analysis | Economical coordinator or bounded workers | Source, extraction, citation, calculation, and completeness checks; sampled audits use an independent economical reviewer |
| Exact edits, documentation sync, formatting, and settled cosmetic changes | Economical coordinator | Proportionate checks and stable audits |
| Unmatched work | Brief inspection, then a recorded routing decision | The resulting category's review rule |

Following an accepted plan stays economical. A new consequential choice returns to frontier. A mixed request to read documents and create a plan separates economical evidence gathering from frontier planning.

A hard bug can return to economical execution once there is evidence of the reproduction, root cause, bounded correction, and regression check. Two execution attempts without new evidence or measurable progress trigger escalation; research and PDF failures instead use appropriate economical tools or report the limitation.

Reviewers return `PASS`, `REPAIR`, or `BLOCKED`. Repairs return to the executor for targeted fixes and retesting, followed by fresh review where required. Two unsuccessful repairs move difficult execution to frontier. Missing required review prevents accepted completion.

## Install

Clone the repository, then copy one folder. There is no build step, service, API key, or second account.

### Codex

```sh
git clone https://github.com/GregStarling/ai-skills.git
mkdir -p ~/.agents/skills
cp -R ai-skills/skills/delegate ~/.agents/skills/delegate
```

Start a new task with your chosen coordinator and write an ordinary request:

```text
Trace where this setting is read and explain its default.
```

### Claude Code

```sh
git clone https://github.com/GregStarling/ai-skills.git
mkdir -p ~/.claude/skills
cp -R ai-skills/skills/delegate ~/.claude/skills/delegate
```

Start a new session with your chosen coordinator and write:

```text
Trace where this setting is read and explain its default.
```

The skill is designed for automatic discovery on covered tasks. You can also invoke it explicitly with `$delegate` in Codex or `/delegate` in Claude Code. Casual conversation, creative drafting, and voice-sensitive editing stay outside automatic delegation.

For a project-only install, copy the folder into that project's `.agents/skills/` or `.claude/skills/` directory instead. To update, replace the complete installed `delegate` folder. Keep backups outside a skill-discovery directory. Keep the canonical repository's `skills/` source inert.

## Try It on a Real Job

```text
This OAuth error only happens in production. Trace the request from the route to the callback, show me the deciding code, and fix it if the cause is clear. Run the relevant checks.
```

The coordinator inspects the symptom and routes an uncertain diagnosis to frontier. Once the correction is established, routine implementation can return to the coordinator. The fix gets regression checks and a fresh frontier review before completion is recorded.

For a request to compare policy documents, the coordinator gathers and checks the evidence economically. Conflicting sources alone do not trigger frontier. If the user also needs a consequential decision or a plan, that becomes a separate frontier assignment.

## One Rule for a Tiny App or a Monorepo

The assignment is the unit of work. A small change in a large codebase stays small when the owner, write boundary, and relevant checks are clear. Delegate starts from a symbol, symptom, or feature, then follows the dependencies needed to finish the job.

Independent investigations and settled workstreams can use bounded workers when useful. Repository size, document length, file type, and source volume never independently require frontier.

## Validation and Rollout Status

The targeted Codex trials verified economical execution, automatic fresh frontier review, and persisted completion for a bug fix with 21 passing regression checks. A research trial completed on Terra with no frontier calls and passed the strict output checks. These trials precede the release-review fixes to explicit independent review and campaign accounting. Local regression tests cover those fixes, completion validation, persistence failures, and idempotent retries.

Full rollout remains incomplete. Claude live validation is blocked by the recorded Fable quota failure, and final acceptance plus fresh installed-session/default checks remain outstanding. The revised skill has not been installed into the personal discovery locations, and saved defaults have not been changed as part of this rollout. These trials do not establish general model qualification or a broad savings claim.

See the [latest targeted results](docs/completion-remediation-live.md) and [local repair checks](docs/completion-remediation.md). Earlier campaign results remain historical evidence for their recorded source revisions.

## The Details, If You Want Them

Delegate is the skill you install. Model Governor is the maintainer tooling used to test and maintain it. The engine, benchmark notes, routing policy, and validation record live in the docs.

- [Install details](docs/install.md)
- [Skill instructions and routing policy](skills/delegate/SKILL.md)
- [Interactive system map](docs/delegate-system.html)
- [Deterministic routing policy and checklist](docs/deterministic-routing-refinement.md)
- [Latest targeted live checks](docs/completion-remediation-live.md)
- [Historical evaluation notes](docs/delegate-ordinary-results-2026-09-11.md)
- [Validation record](docs/validation-status.md)
- [Model Governor](docs/model-governor-spec.md)
