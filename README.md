# Delegate

**Use the cheapest model that can do the job. Make a frontier model check the work.**

Most AI coding workflows use the same expensive model for everything: understanding the problem, writing boilerplate, fixing tiny bugs, running tests, reviewing the result.

That works. It is also wasteful.

**Delegate** is a portable skill for Claude Code and Codex that separates **judgment from execution**.

```text
You
 ↓
Frontier coordinator
understand • diagnose • plan • define boundaries
 ↓
Cheapest sufficiently evidenced worker
implement • fix • test • research
 ↓
Frontier verification
inspect the actual result
 ↓
PASS
or targeted repair / escalation
```

The goal is simple:

> **Use the least expensive model that can reliably do the work, while keeping frontier intelligence responsible for the decisions that matter.**

No daemon. No database. No routing service. No extra API keys. No Node installation for the skill. Foreman is not required.

Copy one folder into your project and use it.

---

## Quick start

Clone this repository:

```sh
git clone https://github.com/GregStarling/ai-skills.git
```

Then copy the **entire** `skills/delegate/` folder into your AI coding environment.

The commands below are for a fresh installation and refuse an existing destination. If you already have a `delegate` folder or symlink, move it aside first. When updating, replace the complete folder so old and new routing files are not mixed.

### Claude Code

For one project:

```sh
mkdir -p "/path/to/your-project/.claude/skills"
test ! -e "/path/to/your-project/.claude/skills/delegate" && test ! -L "/path/to/your-project/.claude/skills/delegate" &&
  cp -R ai-skills/skills/delegate "/path/to/your-project/.claude/skills/delegate"
```

Or install it for your user:

```sh
mkdir -p ~/.claude/skills
test ! -e ~/.claude/skills/delegate && test ! -L ~/.claude/skills/delegate &&
  cp -R ai-skills/skills/delegate ~/.claude/skills/delegate
```

Then:

```text
/delegate fix the failing checkout test
```

### Codex

For one project:

```sh
mkdir -p "/path/to/your-project/.agents/skills"
test ! -e "/path/to/your-project/.agents/skills/delegate" && test ! -L "/path/to/your-project/.agents/skills/delegate" &&
  cp -R ai-skills/skills/delegate "/path/to/your-project/.agents/skills/delegate"
```

Or install it for your user:

```sh
mkdir -p ~/.agents/skills
test ! -e ~/.agents/skills/delegate && test ! -L ~/.agents/skills/delegate &&
  cp -R ai-skills/skills/delegate ~/.agents/skills/delegate
```

Then in Codex CLI or IDE:

```text
$delegate fix the failing checkout test
```

You can also select the skill through `/skills`. In the Codex desktop app, use the skill selector.

See the [official Codex skill documentation](https://learn.chatgpt.com/docs/build-skills) for discovery and invocation details.

**Copy the complete folder, not just `SKILL.md`.** The routing pack and its supporting files are part of the skill.

Your existing Claude Code or Codex authentication is used. Delegate does not require separate provider API keys.

---

## What can I give it?

Start with the task you would normally hand to your coding agent. Delegate checks the current pack's supported scope and your host's available controls before dispatching work.

```text
/delegate find out why sync hangs after reconnect and fix it

/delegate build the settings page from this mockup

/delegate add CSV export without changing the public API

/delegate refactor this module and get the tests green

/delegate investigate this repo and tell me where authentication is enforced

/delegate build this feature end to end
```

For Codex, use `$delegate` instead.

Small jobs stay small. Larger projects are decomposed into bounded workstreams and can use multiple workers when the work is genuinely independent.

---

## What makes Delegate different?

Delegate does **not** ask an LLM to look at a list of models and guess which one feels appropriate.

It uses a versioned routing pack built from model availability, task evidence, host controls, economics, qualification results and explicit limitations.

The routing rule is:

```text
Can it do the job?
        ↓
CAPABILITY

Of the models that can:
which is cheapest?
        ↓
ECONOMICS
```

Capability comes first.

A cheap model does not win because it is cheap. It has to clear the evidence bar for the work.

Within the same evidence level, cheaper eligible treatments are preferred. Replacing an established qualified route still requires the governor's promotion evidence.

### Subscription-first economics

Delegate is designed primarily for Claude Code and Codex subscription users.

Subscriptions do not necessarily expose a meaningful dollar cost for each individual task, so Delegate uses **API-equivalent economics** as a common proxy for relative model expense.

Where measured data exists, the system can account for the actual token mix, failures, retries, repairs and review work required to get an accepted result.

That makes the question:

> **What is the cheapest model per successful task?**

not merely:

> Which model has the cheapest token price?

API-equivalent dollars are a routing proxy. They are **not** presented as your actual subscription bill.

A successful API evaluation cannot qualify a Claude Code or Codex treatment. Capability evidence must match the execution host, model and effort.

---

## The frontier model still has a job

Delegate is not "send everything to the cheapest model."

Some work is cheap to execute but expensive to misunderstand.

For UI work, the frontier settles the interface before delegating implementation.

For difficult debugging, the frontier reproduces the failure and diagnoses the cause before handing off the fix.

For complex implementation, the frontier settles architecture and interfaces first.

For a full project, the frontier decomposes the project, establishes boundaries between workstreams, integrates the result and remains responsible for the final outcome.

Then cheaper models do the bounded work they have evidence to handle.

**Frontier judgment. Economical execution.**

---

## Every result gets checked

Delegation is only half of the loop.

Frontier verification is mandatory.

The verifier inspects the actual artifact, tests, behavior, rendered interface, source-backed claims or other evidence appropriate to the task.

If the result is wrong, Delegate normally sends a targeted repair back to the same inexpensive worker first.

If the worker demonstrates that it cannot handle the task, Delegate escalates to the next eligible treatment.

It does not silently turn the frontier coordinator into the implementation worker just because the first attempt failed.

---

## Evidence beats a leaderboard

There is no permanent ranking that says:

```text
Model A > Model B > Model C
```

Models are evaluated against kinds of work.

A small model might be the right choice for a mechanical edit and the wrong choice for an ambiguous debugging task.

Delegate prefers stronger evidence in this order:

```text
qualified task evidence
        ↓
matching installed acceptance
        ↓
provisional smoke evidence
```

Economics determine ordering **within the appropriate evidence level**.

A cheaper model with weak evidence does not jump ahead of a model that has actually demonstrated it can perform that class of work.

And when the system does not know something, it says so.

Unknown cost stays unknown. Unobserved effort stays unobserved. Configuration evidence is not mislabeled as runtime attestation. Failed attempts remain failed attempts.

That conservatism is intentional.

---

## Built for models that keep changing

Model releases move quickly. The rules should not.

Delegate separates the **constitution** from the **roster**.

```text
New model released
        ↓
discover
        ↓
observe / evaluate
        ↓
qualify
        ↓
compare economics
        ↓
compile new routing pack
```

A new model can change which model gets a task.

It cannot change the rules required to earn that task.

The current governance policy also distinguishes between what a host was configured to run and what the runtime independently proves it served. Identity assurance is derived from preserved execution evidence rather than trusting an agent's own claim about what model ran.

Routing packs do not update themselves. Refresh is due after **seven days**, and a pack expires after **thirty days**. Individual treatments can expire sooner with their underlying evidence. Pull repository updates and replace the complete installed folder; republishing a pack does not renew old evidence.

---

## Current status

Delegate is usable within the current pilot scopes, and the evidence program is intentionally conservative.

The public routing pack currently contains **15 provisional routes and zero fully qualified routes** across Claude Code and Codex. Routes are not labeled fully qualified until they satisfy the governor's real task, sample, quality, latency, identity and review requirements.

The pilot covers low-risk local JavaScript/HTML work and analysis of supplied local material. Broader class fit remains provisional extrapolation, not proof of general performance across languages or web research. One narrow Claude medium-risk mechanical route covers the observed quantity-default fix; other medium-risk domains, high and critical remain unsupported. See [host evidence and scope](docs/v4-host-evidence.md).

That means the system may occasionally refuse a route that a human would probably be willing to try.

That is preferable to inventing confidence it has not earned.

The current validation state, host evidence and known limitations are published in [`docs/v5-validation.md`](docs/v5-validation.md).

---

## What's in `skills/delegate/`?

The folder you install contains everything the consumer needs:

```text
delegate/
├── SKILL.md
├── routing-pack.json
├── pack-format.md
├── task-classes.md
├── delegation-contract.md
├── swarm-policy.md
├── verification-policy.md
└── hosts/
    ├── claude.md
    └── codex.md
```

`SKILL.md` teaches the coordinator how to behave.

`routing-pack.json` contains the current model treatments and routes.

The remaining files are focused references loaded only when their part of the workflow applies.

You do not need the Model Governor repository code to use the installed skill.

---

## For maintainers

The rest of this repository is the machinery that keeps the portable routing pack honest.

Model Governor handles discovery, evaluation, evidence, qualification, economics, promotion, receipts, identity assurance and pack compilation.

Production receipts can feed future qualification, but a model-written receipt never grants itself authority. Evidence is independently validated before it affects routing.

To run the repository checks:

```sh
npm ci
npm test
npm run typecheck
npm run build
node scripts/verify/skills.mjs
node dist/cli/index.js validate-routing-pack --input skills/delegate/routing-pack.json
```

GitHub Actions runs these checks on every pull request and `main` push. The historical `verify:v1` and `verify:v1:live` commands cover the governor engine; some fixture calibration checks need a local Foreman source checkout. That is test provenance, not a dependency of the installed skill.

Routing knowledge can be refreshed through [`skills/refresh-models/`](skills/refresh-models/).

For the deeper implementation:

[Routing-pack maintenance](docs/routing-pack-maintenance.md) · [Production receipts](docs/production-receipts.md) · [V5 identity assurance](docs/v5-identity-assurance.md) · [V4 economics](docs/v4-economics.md)

---

## The idea

The best model should not have to do all the work.

It should know **what work needs its intelligence**.

Delegate is an attempt to make that distinction explicit, measurable and portable:

> **Let the cheapest capable model do the work. Make the best model prove it worked.**
