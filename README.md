# AI Skills

## Build More. Babysit Less.

Your coding agent can write the code. You still find yourself reconstructing the
project, keeping the plan moving, questioning the design, chasing bugs, deciding
what needs review, and checking whether the release worked.

**Give your agent a process for those jobs, too.**

AI Skills is a collection of six independently installable skills for **Codex
and Claude Code**. Each owns a specific part of the work, with clear boundaries
and evidence for its conclusions. Use one to solve the problem in front of you,
or combine them across a project.

| Skill | What you hand off | What you get back |
| --- | --- | --- |
| [**Catchup**](skills/catchup/) | “Bring me up to speed.” | A concise briefing on current work, unfinished changes, and the next supported step. |
| [**CTO**](skills/cto/) | “Take this plan through completion.” | Implementation, a persistent work ledger, and evidence against the agreed outcome. |
| [**Delegate**](skills/delegate/) | “Give this work the reasoning it needs.” | Economical coordination, stronger reasoning where warranted, and required independent review. |
| [**Design Director**](skills/design-director/) | “Give this interface a direction.” | Design decisions grounded in product evidence, with explicit unknowns and verification criteria. |
| [**Debug**](skills/debug/) | “Find the cause and prove the fix.” | A faithful reproduction, a scoped correction, and regression evidence. |
| [**Ship**](skills/ship/) | “Get these changes released.” | A verified release, with the revision, check results, and published-result evidence. |

Install the full collection from the project where you use your agent:

```sh
npx skills add GregStarling/ai-skills --skill catchup cto delegate design-director debug ship --agent codex claude-code --copy
```

Every skill is readable source. Inspect the instructions, install only what you
need, and adapt them to your work.

## Catchup: Pick Up Where the Work Actually Stands.

Returning to a project creates a job before the job: reconstructing what
happened. Which branch has the work? Did the PR merge? Does the task list still
match the code?

Catchup reads the working tree, recent history, available PR and CI evidence,
and existing project records. If CTO has a ledger, it checks those claims against
the repository. You get a short brief covering current state, work in flight,
material uncertainty, and the next supported action.

**The briefing leaves your project alone.** Catchup does not edit files, fetch
Git refs, run builds, or resume implementation. It labels inferred priorities
and missing remote information instead of presenting guesses as current facts.

```text
Catchup. What is unfinished, what changed recently, and what should I pick up
next? Read only; do not resume the build.
```

[Explore Catchup →](skills/catchup/)

## CTO: Hand Over the Plan. Get Back to Your Work.

> The user handed you a plan and left the room. They are buying one thing:
> they come back and it is shipped.

Give CTO a PRD, roadmap, issue set, or implementation plan. It turns the outcome
into acceptance criteria and keeps moving through implementation, integration,
checks, and repairs. A progress update does not end the assignment.

Long builds need continuity. CTO maintains `.cto/ledger.md` with requirements,
work items, decisions, failed attempts, and verification evidence. After a restart
or handoff, the next session can inspect the ledger and repository before resuming.
When repeated fixes fail, CTO changes the diagnostic approach or escalates.

**Completion has to survive a separate acceptance pass.** CTO rereads the original
plan and looks for missing requirements, broken flows, and tests that pass while
the behavior is wrong. Requested release steps remain part of completion when
authorized; external blockers remain visible.

```text
CTO mode. Implement the plan in PLAN.md. Preserve the existing public API,
verify the main user flows, and continue until every requirement is complete.
```

[Explore CTO →](skills/cto/)

## Delegate: Put Stronger Reasoning Where It Matters.

A routine edit, an architecture decision, and an unexplained production failure
need different kinds of attention. Delegate keeps a capable, economical
coordinator on routine work and brings in frontier reasoning for plans,
consequential decisions, and difficult diagnosis.

Execution and review are separate decisions. Medium-risk and higher implemented
behavior requires fresh independent review. Low-risk work gets direct checks and
a stable audit sample. Hard-bug fixes and consequential decisions retain their
review requirements through handoffs and repairs.

**A review finding goes back into the work.** Reviewers return PASS, REPAIR, or
BLOCKED, and corrections get verified before acceptance. Models and tools depend
on what the host actually provides; the skill does not change saved settings or
claim measured savings from the conversation.

```text
Use Delegate to implement this change. Route the consequential decisions and
satisfy the required review before calling it complete.
```

[Explore Delegate →](skills/delegate/) · [Routing and architecture](docs/delegate.md)

## Design Director: Give Every Design Choice a Reason.

“Make it look good” leaves too much unanswered. Who uses this product? What are
they trying to accomplish? Which behaviors and promises must survive a redesign?
Design Director starts with those questions and the evidence available to answer
them.

It can derive a design direction, analyze a conflict, evaluate a built interface,
or propose a focused amendment. A mandatory floor protects accessibility,
truthful content, user autonomy, and recovery. Design principles guide the work;
product evidence determines the product-specific direction.

**You get decisions you can inspect and challenge.** Each pass produces a
structured proposal with evidence and open questions. A bundled validator checks
the artifact's structure and encoded evidence requirements. Rendered inspection
and behavior checks still determine whether the design works. Standalone
proposals are advisory; durable adoption and storage require a host runtime.

```text
Use Design Director to evaluate the onboarding flow. Preserve the product's
promises, inspect the real states, and distinguish implementation problems
from evidence that the design direction needs to change.
```

[Explore Design Director →](skills/design-director/)

## Debug: Make the Bug Show Its Work.

A plausible explanation can send an agent straight into editing. Debug asks for
evidence first. It traces the failing path and checks that the reproduction fails
for the reported reason before changing production code.

The correction must pass the check that exposed the failure. Debug also runs
relevant surrounding checks and follows shared callers when the same cause
affects more than one entry point. Unrelated improvements stay out of the fix.

**One lucky passing run does not close an intermittent bug.** Debug investigates
timing, configuration, environment, and data; records the conditions; and states
what the evidence can prove. If reproduction remains unavailable, you get the
observations, remaining hypotheses, and the next useful experiment. Diagnosis-only
requests remain diagnosis-only. Debug itself does not authorize publishing.

```text
Debug this failure: --retries 0 still performs retries. Reproduce the bug,
fix its cause, and verify the CLI and any callers sharing the same logic.
```

[Explore Debug →](skills/debug/)

## Ship: Close the Gap Between Done and Live.

Completed code still needs a release. Ship reviews the intended changes, runs
the relevant checks, updates existing project records, and follows the
repository's branch, pull-request, and publication rules.

It tracks the actual released revision through required CI and deployment
checks. Failures lead to diagnosis and bounded repairs. Unrelated work and
existing commit history stay protected, and required human approvals remain
release gates.

**The finish line is the result people receive.** Ship verifies changed behavior
in a live app, a package installed from its registry, or the files published in
a repository. The final proof identifies the revision, checks, publication,
verification, and time. Missing infrastructure is reported honestly; an incomplete
required step cannot become a successful release claim.

```text
Ship the current changes. Follow this repository's release process, chase
required checks, and verify the published result.
```

[Explore Ship →](skills/ship/)

## Choose the Job. Combine the Skills When It Helps.

You do not need all six for every task. Catchup can brief you without starting
a build. Debug can resolve a defect without releasing it. Ship can publish
completed work without requiring a CTO plan.

For a larger project, their responsibilities fit together:

| Responsibility | Skill |
| --- | --- |
| Establish the current state before resuming | Catchup |
| Own scope, dependencies, the ledger, and final acceptance | CTO |
| Route reasoning, escalation, and required review throughout the work | Delegate |
| Ground interface decisions and design verification in product evidence | Design Director |
| Investigate failures and prove scoped corrections | Debug |
| Execute and verify the authorized release | Ship |

Installing the collection makes these workflows available; it does not start
all of them or authorize every action. CTO retains overall acceptance when it
owns the plan. The other skills contribute their work and evidence.

If you also use [Ponytail](https://github.com/DietrichGebert/ponytail), it pushes
implementation toward the simplest correct solution. Requested behavior and
required verification still matter. Ponytail is a separate project and an
optional companion.

## Install One Skill or the Whole Collection

Use the [open skills CLI](https://github.com/vercel-labs/skills) from your project.
Choose one name or list the skills you want:

```sh
# One skill
npx skills add GregStarling/ai-skills --skill debug --agent codex claude-code --copy

# A selection
npx skills add GregStarling/ai-skills --skill catchup debug ship --agent codex claude-code --copy

# All six
npx skills add GregStarling/ai-skills --skill catchup cto delegate design-director debug ship --agent codex claude-code --copy
```

| Skill | Install name | Codex | Claude Code |
| --- | --- | --- | --- |
| Catchup | `catchup` | `$catchup` | `/catchup` |
| CTO | `cto` | `$cto` | `/cto` |
| Delegate | `delegate` | `$delegate` | `/delegate` |
| Design Director | `design-director` | `$design-director` | `/design-director` |
| Debug | `debug` | `$debug` | `/debug` |
| Ship | `ship` | `$ship` | `/ship` |

Add `--global` for availability across projects. Remove the agent name you do
not use. `--copy` installs complete copies of the selected folders.

Node.js runs the installer, Delegate's review helper, and Design Director's
validator. Catchup, CTO, Debug, and Ship are instructions only. Consumer skills
need no repository build or separate service. They use the tools and authorized
access available in your existing agent session.

Skills can activate for matching requests or be invoked by name. Start a fresh
session if a new installation does not appear. They preserve your permissions
and model settings, and cannot keep running after their host closes. Reinvoke
CTO in the same project to resume from its ledger.

[Manual installation, updates, and removal →](docs/install.md)

## Bringing Your Existing Skills Across

Catchup and Ship have portable successors here. **Repro is now Debug**, installed
and invoked as `debug`; this collection does not register a `repro` alias.
Design Director includes its original validator, references, source lineage,
and MIT license, with installation adapted to this collection.

If you already use a copy from `claude-commands` or `design-director`, follow the
[migration instructions](docs/install.md#migrating-from-claude-commands). Preserve
local customizations before replacing a complete skill folder and confirm which
copy the host loads. Installing from this collection does not uninstall an old
plugin or retire either original repository.

## Inspect the Evidence Behind the Promise

Validation includes clean installations for both hosts, packaging and reference
checks, independent review, and the repository's regression suite. Behavioral
exercises include a CTO build, read-only Catchup briefings, a failing-to-passing
Debug repair, and an isolated Ship release. Design Director has validator
contract tests and installed-helper checks.

These are bounded checks. Simulated provider cases and synthetic contract
fixtures do not prove production behavior or design quality for every project.
The records keep those limits explicit:

- [Collection installation and discovery](docs/skills-collection.md)
- [Delegate validation history](docs/validation-status.md)
- [Catchup and Debug exercises](docs/catchup-debug.md)
- [Ship release exercise](docs/ship-skill.md)
- [Design Director import and contract checks](docs/design-director-import.md)

<details>
<summary><strong>For Skill Authors and Maintainers</strong></summary>

Add `skills/<name>/SKILL.md` with `name` and `description` frontmatter, a short
README, and only the resources it needs. Keep consumer references inside that
folder and installation paths out of portable behavior. Add the skill to the
catalog and install table, then run `node scripts/verify/skills.mjs` after
`npm ci`. Consumer skills are checked from isolated copies; no central
registration file is needed.

Keep this library checkout inert by installing into your own projects or
personal directory. [refresh-models](skills/refresh-models/SKILL.md) is a maintainer
workflow for Delegate's routing pack. Model Governor, policy, fixtures, and
evaluation history remain maintainer tooling, separate from the six consumer
skills above.

Repository checks: `npm test`, `npm run typecheck`, `npm run build`, and
`node scripts/verify/skills.mjs`.

[Maintainer activation and measurement notes](docs/delegate-install.md)

</details>
