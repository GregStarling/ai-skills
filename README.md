# Delegate

## Stop Paying the Coordination Tax

Most agent setups turn one task into a chain of handoffs. Every handoff needs context, a brief, a review, and sometimes a repair. The extra work can cost more than the task.

Delegate starts with a simpler rule. Let the strongest model finish contained work. Bring in a cheaper worker only when a bounded search, source review, or isolated change earns the extra loop. The strong model keeps the judgment, the verification, and the final answer.

Direct work is the default.

## Install

Clone the repository, then copy one folder. There is no build step, service, API key, or second account.

### Codex

```sh
git clone https://github.com/GregStarling/ai-skills.git
mkdir -p ~/.agents/skills
cp -R ai-skills/skills/delegate ~/.agents/skills/delegate
```

Start a new task, then write:

```text
$delegate trace where this setting is read and explain its default
```

### Claude Code

```sh
git clone https://github.com/GregStarling/ai-skills.git
mkdir -p ~/.claude/skills
cp -R ai-skills/skills/delegate ~/.claude/skills/delegate
```

Start a new session, then write:

```text
/delegate trace where this setting is read and explain its default
```

For a project-only install, copy the folder into that project's `.agents/skills/` or `.claude/skills/` directory instead. To update, replace the complete installed `delegate` folder. Keep backups outside a skill-discovery directory.

## Try It on a Real Job

```text
/delegate This OAuth error only happens in production. Trace the request from the route to the callback, show me the deciding code, and fix it if the cause is clear. Run the relevant checks.
```

Delegate starts with a few direct searches. A contained job stays with the strong model. If the investigation opens across packages or source collections, the worker gets a tight question, an allowed area, and a stopping point. It returns evidence, not a pile of notes. The strong model checks the decisive sources, makes the call, and verifies the result.

More agents are a tax until they remove real work.

## One Rule for a Tiny App or a Monorepo

The repository is not the unit of work. The assignment is. A small change in a large codebase stays small when the owner, write boundary, and relevant checks are clear. Delegate starts from a symbol, symptom, or feature, then follows only the dependencies needed to finish the job.

When the work genuinely branches, it can hand off independent research or isolated implementation. When the decision is consequential, the strong model keeps it.

## The System

![Delegate system map](docs/delegate-system.png)

The map shows the direct path, bounded delegation, the acceptance boundary, and local feedback.

## The Details, If You Want Them

Delegate is the skill you install. Model Governor is the maintainer tooling used to test and maintain it. The engine, benchmark notes, routing policy, and validation record live in the docs.

- [Install details](docs/install.md)
- [Skill instructions and routing policy](skills/delegate/SKILL.md)
- [Interactive system map](docs/delegate-system.html)
- [Evaluation notes](docs/delegate-ordinary-results-2026-09-11.md)
- [Validation record](docs/validation-status.md)
- [Model Governor](docs/model-governor-spec.md)
