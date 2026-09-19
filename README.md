# AI Skills

## Build More. Babysit Less.

You give your coding agent a plan. It finishes the first piece, tells you what
comes next, and waits. You become the project manager: keeping track of unfinished
work, asking it to continue, and deciding when a problem needs a stronger model.

**CTO takes ownership of the plan. Delegate puts the right reasoning behind the
work.** Together, they give your agent a process for building, checking, fixing,
and continuing through to verified completion.

Two skills. Install either. Use both when you want the whole workflow.

| Skill | The job you hand off | The standard it holds |
| --- | --- | --- |
| [**CTO**](skills/cto/) | Take this plan and implement it through shipping. | Every requirement needs evidence before the build is called done. |
| [**Delegate**](skills/delegate/) | Decide which work needs stronger reasoning and independent review. | Routine work stays economical. Consequential work gets the attention it requires. |

Built for **Codex and Claude Code**, with portable skill files you can read,
inspect, and adapt.

```sh
npx skills add GregStarling/ai-skills --skill cto delegate --agent codex claude-code --copy
```

## CTO: Hand Over the Plan. Get Back to Your Work.

> The user handed you a plan and left the room. They are buying one thing:
> they come back and it is shipped.

That's the operating principle. Give CTO a PRD, roadmap, issue set, task list,
or implementation plan. It turns the outcome into acceptance criteria, breaks
it into verifiable work, and takes responsibility for moving each item through
implementation and testing.

A progress update doesn't end the job. A failing test starts another diagnosis.
A difficult bug triggers escalation. CTO keeps working through the approved plan
without asking you to authorize every next phase.

### The Work Survives the Conversation

Long builds outlast a single context window. CTO keeps a ledger in your project
at `.cto/ledger.md`: what's required, what's finished, what failed, what was
decided, and what proves the result. After a restart or handoff, the next session
reads the ledger, checks the repository, and resumes from the actual state.

You get a record of the build instead of a checklist you have to carry in your head.

### Stuck Is a Signal to Escalate

When two different fixes leave the same failure standing, CTO changes the approach.
It seeks the strongest reasoning available, then a fresh diagnosis or another
model family when available. If the implementation strategy is the problem, it
reworks that strategy while preserving the outcome you asked for.

A missing credential or authorization can block part of the plan. CTO records
exactly what's needed and continues the work that can still move forward.

### “Done” Has to Survive Review

Before declaring completion, CTO reopens the original plan and tries to prove the
build is incomplete. Missing requirements. Untested user flows. Broken integrations.
Tests that pass while the behavior is wrong. Material findings go back into the
work queue for repair and verification.

**SHIPPED means the agreed outcome is verified, including the release step when
one was requested and authorized.**

[Explore CTO →](skills/cto/)

## Delegate: Coordinate Cheaply. Bring in Frontier When It Matters.

A routine edit, an architecture decision, and a production bug call for different
levels of reasoning. Delegate keeps a capable, economical model in charge of the
conversation and brings in stronger agents for the work that warrants them.

The coordinator handles routine tasks directly. Agents get bounded assignments,
return their results, and the coordinator continues. Execution and review are
separate decisions, so choosing an economical implementation path doesn't remove
a required quality check.

### Give Each Job the Attention It Deserves

| Work | How Delegate Handles It |
| --- | --- |
| Plans and consequential decisions | Bring in frontier reasoning to settle the approach. |
| Hard bugs and uncertain root causes | Start with stronger diagnosis; hand back a bounded fix once the cause is understood. |
| Features and understood fixes | Use the coordinator or a bounded worker, with review based on risk. |
| Research, PDFs, and source comparison | Keep the work economical and verify the evidence. Volume alone doesn't trigger an expensive agent. |
| Implemented behavior | Require fresh frontier review at medium risk and above; low-risk work gets direct checks plus a stable audit sample. |

Hard-bug fixes and implementation of consequential decisions retain their review
requirements through handoffs. Renaming a security change “routine implementation”
doesn't make the review disappear.

### Review Leads to Repair

Reviewers return **PASS**, **REPAIR**, or **BLOCKED**. Findings go back to the
executor with a concrete correction and an acceptance check. Required review stays
part of completion, including after repairs.

The aim is economical coordination with clear standards for when to spend more
reasoning. Results depend on the task and the capabilities your host provides;
the [validation record](docs/validation-status.md) keeps observed results and
untested claims separate.

[Explore Delegate →](skills/delegate/) · [Architecture and routing details](docs/delegate.md)

## Use Them Together. Keep Your Attention on the Outcome.

CTO owns the plan, the ledger, and the decision that the whole build is finished.
Delegate handles task routing, escalation, and required independent review. A
worker can finish its assignment; CTO still has to prove the assignments fit
together into the product you requested.

If you also use [ponytail](https://github.com/DietrichGebert/ponytail), it pushes
each implementation toward the simplest correct solution. CTO preserves the
approved scope. Delegate preserves required review. Ponytail keeps the code small.

Ponytail is a separate project. CTO and Delegate each work on their own, and
neither requires ponytail.

## Try Them on a Real Job

**Hand CTO a plan:**

```text
CTO mode. Implement the plan in PLAN.md. Keep the existing public API,
verify the main user flows, and continue until every requirement is complete.
```

CTO defines completion, records the work, and starts implementing. With Delegate
installed, it applies the routing and review rules along the way.

**Give Delegate a difficult bug:**

```text
This OAuth error only happens in production. Trace the request from the route
to the callback, find the root cause, and fix it. Run the relevant checks.
```

Delegate routes an uncertain diagnosis to stronger reasoning. Once the correction
is understood, routine implementation can return to the coordinator. The fix gets
regression checks and fresh independent review.

## Install

Use the [open skills CLI](https://github.com/vercel-labs/skills) from the project
where you use your agent. Choose either skill or install both:

```sh
# CTO
npx skills add GregStarling/ai-skills --skill cto --agent codex claude-code --copy

# Delegate
npx skills add GregStarling/ai-skills --skill delegate --agent codex claude-code --copy

# Both
npx skills add GregStarling/ai-skills --skill cto delegate --agent codex claude-code --copy
```

Add `--global` to make them available across projects. Omit an agent name if you
only use the other. Node.js is needed for the installer and Delegate's review
helper; CTO itself is instructions only. There is no repository build, service,
or separate API key to configure for either consumer skill.

Prefer to copy the files yourself? Follow the [manual installation guide](docs/install.md),
which also covers updates and removal.

| Agent | Invoke CTO | Invoke Delegate |
| --- | --- | --- |
| Codex | `$cto` | `$delegate` |
| Claude Code | `/cto` | `/delegate` |

Both can activate automatically for matching requests. CTO is for complete-plan
execution; ordinary coding questions don't launch CTO mode. Start a fresh session
if a newly installed skill doesn't appear.

These skills run inside your existing agent session. They preserve your permissions
and model settings. They cannot run after the host closes or bypass its limits;
reinvoke CTO in the same project to resume from the ledger.

## Inspect the Work Behind the Promise

The collection has been checked with clean installs for both hosts, native skill
discovery, independent review, and the repository's regression suite. CTO's
behavioral checks include a small build taken from failing tests through repair
and verified completion. Those checks are bounded evidence, not a guarantee for
every project.

[Collection validation](docs/skills-collection.md) · [Delegate validation history](docs/validation-status.md)

<details>
<summary><strong>For Skill Authors and Maintainers</strong></summary>

Add `skills/<name>/SKILL.md` with `name` and `description` frontmatter, a short
README, and only the resources it needs. Keep consumer references inside that
folder and installation paths out of portable behavior. Add it to the catalog,
then run `node scripts/verify/skills.mjs` after `npm ci`. Consumer skills are
checked from isolated copies; no central registration file is needed. Keep this
library checkout inert by installing into your own projects or personal directory.

[refresh-models](skills/refresh-models/SKILL.md) is a maintainer workflow for
Delegate's routing pack. Model Governor, policy, fixtures, and evaluation history
remain maintainer tooling. Consumers install CTO and/or Delegate.

Repository checks: `npm test`, `npm run typecheck`, `npm run build`, and
`node scripts/verify/skills.mjs`.

[Maintainer activation and measurement notes](docs/delegate-install.md)

</details>
