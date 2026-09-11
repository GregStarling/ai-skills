# Delegate

**Make your best model's usage go further.**

Delegate is a portable skill for Claude Code and Codex that puts cheaper eligible models to work and brings important decisions back to your strongest model. Its north star: **the requested quality with the least total tokens or subscription usage.**

Your strongest model is valuable when the answer requires judgment. Finding the relevant files, tracing a value through a codebase, extracting facts and applying a settled change often need less of that intelligence. Delegate gives those assignments to workers with supporting evidence for the task, while the frontier model stays responsible for decisions and the final result.

You describe the outcome. Delegate organizes the work.

## Let the investigation leave your desk

You shouldn't have to solve a problem before you can hand it off.

Give Delegate a question such as “Where does this value get its default?” A worker can investigate within the available route's boundaries and return the relevant source locations, an explanation and anything still unresolved. The frontier checks the decisive evidence, resolves the specific decision and sends the next assignment back to an eligible worker.

```text
Your question
    ↓
Worker investigates → evidence + unresolved decision
    ↓
Frontier decides
    ↓
Eligible worker continues → frontier verifies → done
```

The answer can be unknown when the investigation starts. What needs to be clear is the question, the scope, the permitted actions and where the worker should stop. That gives workers room to find useful answers without making consequential choices on your behalf.

Useful context can stay with the same worker through follow-ups. A change from investigation to implementation gets a fresh eligibility check. The frontier can build on the evidence already gathered instead of repeating the entire search.

## Spend intelligence where it earns its place

An inexpensive worker can become expensive if it needs repeated repairs or a second model to redo its work. Delegate considers the whole path: coordination, execution, integration, verification and failed attempts.

Tiny tasks can finish directly when a handoff would consume more. Larger work can move through bounded assignments, with stronger reasoning reserved for conflicting evidence, architecture, product decisions and acceptance. Parallel workers are useful when they reduce expected total usage; finishing sooner alone isn't enough.

Every delegated result gets frontier verification. That means checking the sources, changed artifact, relevant tests or rendered interface that support acceptance. The coordinator verifies when eligible; otherwise an eligible reviewer does. Concrete defects go back for targeted repair. Work stops when the requested result is complete and no material defect remains.

The aim is to leave more of your allowance available for the decisions that benefit from your best model.

## Keep the experience small

Delegate fits the coding environment you already use. Install one folder and invoke it with an ordinary task. Your existing authentication and available models supply the execution.

Routine read-only investigations use a short brief and skip receipt-writing ceremony. They still return evidence and receive verification. You can explicitly request a worker, a model or independent review when that matters to the job.

There is no service to host, daemon to supervise or extra API key to manage. The routing helper uses an existing Node runtime and built-in libraries. Model Governor, the tooling maintained in this repository, is not required to use the installed skill.

**Delegate is designed to save usage. Measured subscription savings for this revised workflow have not yet been established.**

## Install and use

Clone the source:

```sh
git clone https://github.com/GregStarling/ai-skills.git
```

Choose your environment. These commands install for your user and refuse to overwrite an existing folder or symlink.

**Codex**

```sh
mkdir -p ~/.agents/skills
test ! -e ~/.agents/skills/delegate && test ! -L ~/.agents/skills/delegate &&
  cp -R ai-skills/skills/delegate ~/.agents/skills/delegate
```

**Claude Code**

```sh
mkdir -p ~/.claude/skills
test ! -e ~/.claude/skills/delegate && test ! -L ~/.claude/skills/delegate &&
  cp -R ai-skills/skills/delegate ~/.claude/skills/delegate
```

For a project-only installation, use that project's `.agents/skills/` or `.claude/skills/` directory instead. Copy the **entire `delegate` folder**, including its helper and routing pack.

In Codex:

```text
$delegate trace where this setting is read and explain its default
$delegate summarize these local documents and flag contradictions
$delegate apply this API rename across the affected JavaScript modules
```

In Claude Code, use `/delegate` with the same requests. You describe the job; the coordinator prepares worker briefs and checks route coverage. Work outside supported routes stays with the frontier unless you explicitly require a worker.

To update, pull the repository and replace the complete installed folder. Keep rollback copies **outside skill-discovery directories** to avoid duplicate skills. Personal learning state survives replacement.

## What makes the routing predictable

The helper maps seven concrete assignments—locating behavior, analyzing supplied sources, mechanical edits, features, fixes, UI and settled plans—to existing evidence routes. It returns one eligible worker and a verification choice. No additional model call ranks the roster.

Selection respects task evidence before economics, then checks availability, exact effort, expiry and reviewer requirements. Failed candidates are excluded on retry. The coordinator must still confirm literal scope and actual host controls. A missing route returns an explicit gap.

The current pack contains **15 provisional routes and zero fully qualified entries** across both hosts. Coverage centers on low-risk local JavaScript/HTML work and supplied local material. Standalone reproduction investigation and live-web discovery lack supported routes. Most higher-risk work also remains outside coverage. See the [coverage audit](docs/delegate-routing-coverage.md) for the exact boundaries.

## Learning that follows the usage goal

Implementation and explicitly tracked work can record outcomes locally. Preferences require at least five supported, comparable tasks per option. Quality and repair burden come first; complete observations of the same usage metric and unit can then break ties. **Elapsed time never changes a learned preference.**

Missing or partial usage remains unknown. Token comparisons establish token differences, not subscription charges. Baseline API-price proxies are labeled separately from observed usage. Personal history stays on your machine and cannot broaden route authority or weaken verification.

Routing packs carry refresh and expiry dates; this pack calls for refresh after seven days and expires after thirty. Individual entries may expire sooner. Updating a pack doesn't renew its underlying evidence. Details: [local learning](skills/delegate/local-learning.md), [routing maintenance](docs/routing-pack-maintenance.md), and [validation status](docs/validation-status.md).

## For maintainers

The rest of the repository compiles and validates the portable routing pack. To run the release checks:

```sh
npm ci
npm test
npm run typecheck
npm run build
node scripts/verify/skills.mjs
node dist/cli/index.js validate-routing-pack --input skills/delegate/routing-pack.json
```

GitHub Actions runs these checks on pull requests and pushes to `main`. Passing software checks does not establish model qualification or measured savings. The [validation index](docs/validation-status.md) separates current artifacts from historical model trials.
