# Delegate

**Make your best model's usage go further.**

Delegate is a portable skill for Claude Code and Codex that puts suitable lower-usage models to work and brings important decisions back to your strongest model. Its north star: **the requested quality while preserving as much subscription allowance as possible.**

Your strongest model is valuable when the answer requires judgment. Finding the relevant files, tracing a value through a codebase, extracting facts and applying a settled change often need less of that intelligence. Delegate gives bounded assignments to suitable available workers, while the frontier model stays responsible for decisions and the final result.

You describe the outcome. Delegate organizes the work.

## Let the investigation leave your desk

You shouldn't have to solve a problem before you can hand it off.

Give Delegate a question such as “Where does this value get its default?” A worker can investigate within the assignment's boundaries and return the relevant source locations, an explanation and anything still unresolved. The frontier checks the decisive evidence, resolves the specific decision and sends the next assignment back to a suitable worker.

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

Direct execution can win at any task size when a handoff would consume more. Larger work can move through bounded assignments, with stronger reasoning reserved for conflicting evidence, architecture, product decisions and acceptance. Parallel workers are useful when they reduce expected allowance consumption; finishing sooner alone isn't enough.

Every delegated result gets frontier verification. That means checking the sources, changed artifact, relevant tests or rendered interface that support acceptance. The coordinator verifies when eligible; otherwise an eligible reviewer does. Concrete defects go back for targeted repair. Work stops when the requested result is complete and no material defect remains.

The aim is to leave more of your allowance available for the decisions that benefit from your best model.

An MVP and a large TypeScript monorepo use the same principle: bound the assignment, not the repository. Start with a symbol, symptom or feature. Find its owner, trace the relevant dependencies, then assign a coherent change. Reading can cross package boundaries while write ownership stays explicit. Integration checks follow affected consumers and contracts; a green test in one package isn't the whole result. You don't have to map the entire codebase before asking for help.

## Keep the experience small

Delegate fits the coding environment you already use. Install one folder and invoke it with an ordinary task. Your existing authentication and available models supply the execution.

Routine investigations use a short brief and one compact outcome record: result, checks and repairs. They still return evidence and receive verification, without a receipt-writing sequence. You can explicitly request a worker, a model or independent review when that matters to the job.

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
$delegate apply this API rename across the affected TypeScript packages
```

In Claude Code, use `/delegate` with the same requests. You describe the job; the coordinator bounds the assignments and checks available workers, permissions and verification needs. Your repository's language and size aren't dispatch gates. Stricter project routing policies still apply.

To update, pull the repository and replace the complete installed folder. Keep rollback copies **outside skill-discovery directories** to avoid duplicate skills. Personal learning state survives replacement.

## What makes the routing predictable

Ordinary dispatch maps concrete assignments to two host-supplied slots: economy for search, source analysis and low-risk precise edits; standard for reproduction, features, fixes, UI and settled plans. The helper returns one worker and a verification choice. No additional model call ranks the roster. These are declared starting heuristics, not measured savings or universal model-capability claims.

The coordinator confirms actual model/effort controls, task boundaries and tools. Unsettled fix diagnoses or interfaces, missing workers and high-risk actions return for frontier attention. Required independent review stays independent. Recent same-project/assignment/model failures and repairs inform reconsideration; direct execution remains an option.

For projects requiring evidence-qualified routing, the separate pack contains **15 provisional routes and zero fully qualified entries**. Its narrow JavaScript/HTML fixture scopes remain unchanged; they do not qualify TypeScript or large-repository work. A qualification requirement cannot be bypassed by switching to ordinary dispatch. See the [coverage audit](docs/delegate-routing-coverage.md) for both paths.

## Learning that follows the usage goal

Ordinary delegated work records a small local outcome, including investigations. Missing usage doesn't prevent failure/repair feedback. Evidence-routed, fully tracked preferences require at least five supported comparable tasks per option. Quality and repair burden come first; complete comparable allowance or attributable-cost observations can then break ties. **Neither elapsed time nor raw token totals select learned winners.**

Missing or partial usage remains unknown. A cheap-model token and a frontier token aren't interchangeable subscription units. Model-specific, cache-aware price estimates are labeled separately from observed spending. Personal history stays on your machine and cannot broaden evidence authority or weaken verification. Earlier paired trials did not establish a delegation advantage; the revised workflow still needs matched usage evidence.

Evidence packs carry refresh and expiry dates; this pack calls for refresh after seven days and expires after thirty. Updating a pack doesn't renew its evidence. Ordinary host dispatch doesn't depend on that pack. Details: [local learning](skills/delegate/local-learning.md), [routing maintenance](docs/routing-pack-maintenance.md), and [validation status](docs/validation-status.md).

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
