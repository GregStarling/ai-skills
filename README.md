# AI skills

The primary product is the complete [delegate folder](skills/delegate/): a portable skill for **frontier coordination → inexpensive capable worker → frontier verification → targeted repair**. It handles a small task with a small work order and a project with bounded workstreams and integration review. Foreman is not required.

The governor is maintainer infrastructure. It compiles current evidence into `routing-pack.json`; consumers read that pack through the skill and use their host's native agent tools. Consumers do not install Node, Promptfoo, a database or a governor service. Existing host authentication is sufficient for routes actually available in that host.

## What ships in the folder

- `SKILL.md`: the orchestration entrypoint.
- `routing-pack.json`: generated, versioned task routes, model/effort identities, economics, qualification summaries and freshness.
- `pack-format.md`: shared-treatment lookup, evidence tiers, host controls and integrity rules.
- `task-classes.md`, `delegation-contract.md`, `swarm-policy.md`, `verification-policy.md`: focused guidance loaded when needed.
- `hosts/claude.md` and `hosts/codex.md`: thin mappings to native host controls.

The skill intersects routes with current host availability. Qualified treatments come first, then provisional treatments with matching installed acceptance, then smoke extrapolation. Economics decide within each evidence level. Frontier verification is mandatory at every risk level, with depth proportional to the task. Repairs return to the original worker before escalation. Full projects decompose into bounded workstreams, never a whole-project worker route.

## Current readiness

**The pack now includes provisional routes for Claude Code and Codex.** Six model/effort treatments come from actual local CLI execution and frontier review, with official metadata and explicit observation limits. The pilot covers low-risk local JavaScript/HTML work and analysis of supplied local material. Broader task fit is provisional extrapolation; this is not evidence of general performance across languages, high-risk work or web research.

No route has been promoted to full governor qualification. Policy v5 preserves v4’s separation of capability from economics and derives native identity assurance from raw host evidence: task, host, exact identity/effort, latency and review evidence qualify capability; missing billed dollars do not prevent it. Selection uses separately evidenced API-equivalent economics as a normalized cost proxy, never the user's subscription bill. API success cannot qualify a Claude Code or Codex treatment. See [v4 economics](docs/v4-economics.md), [v5 identity assurance](docs/v5-identity-assurance.md), [current validation](docs/v5-validation.md), [historical installed-host validation](docs/routing-pack-validation.md) and [evidence](data/routing/host-observations.json).

Installed invocation has been exercised across seven local task shapes on both hosts, including fallback, repair and two/three-worker projects. The UI cases required harness recovery and supervising-frontier browser evidence; those limits and the unsuccessful initial attempts remain in the validation record.

The pack now consumes those accepted cases as evidence for the matching class and treatment, while explicitly identifying untested extrapolations. Hard bugs receive frontier diagnosis before worker fixes; complex changes receive frontier architecture and planning before implementation. Both workflows have [native host verification](data/routing/frontier-ownership-acceptance.json), with failed attempts and controlled-test limits retained. Refresh also records probes of each current official frontier model and why an older evidenced reviewer is retained. [Current frontier probes](data/routing/frontier-probes.json).

One narrow Claude medium-risk mechanical route covers the observed quantity-default fix with a different model and a separate fresh frontier reviewer. Other medium-risk domains, high and critical remain unsupported by the current pack. [Host evidence and scope](docs/v4-host-evidence.md).

## Copy the complete folder

Copy `skills/delegate/` to a host's skill location. For a project, use `.claude/skills/delegate/` in Claude Code or `.agents/skills/delegate/` in Codex. Personal locations are `~/.claude/skills/delegate/` and `~/.agents/skills/delegate/`. Preserve any existing skill with the same name; disposable project installations are used for testing, with no global overwrite.

Claude: `/delegate <task>`. Codex CLI/IDE: `$delegate <task>` or `/skills`; desktop: the skill selector. Copy every referenced file; updating only `SKILL.md` leaves routing knowledge behind. Native subagent controls are preferred; an already-installed authenticated host CLI can execute a selected treatment when the native tool cannot express its controls. [Claude discovery](https://code.claude.com/docs/en/skills) · [Codex discovery](https://learn.chatgpt.com/docs/build-skills).

Pack refresh is due after seven days, with a thirty-day pack lifetime. Each treatment expires independently with its underlying evidence; republishing does not renew evidence. Each task writes a small local execution receipt, including provisional labels, failures, repairs and unknown costs.

## Maintain routing knowledge

Use [refresh-models](skills/refresh-models/SKILL.md) in the maintainer checkout. Discovery, real evaluations and production results feed the governor; qualification and promotion rules produce the updated pack. Review and publish the pack through Git. That does not require consumers to run the compiler.

The [receipt intake commands](docs/production-receipts.md) archive original runs and validate independently captured evidence before feeding the existing qualifier and paired challenger comparison. Unassessed receipts remain pending; failed attempts and unknown costs are retained. GitHub Actions runs tests, type checking, build, skill packaging and routing-pack publication validation on every PR and `main` push.

[Routing-pack maintenance](docs/routing-pack-maintenance.md) · [Existing engine CLI](docs/usage-cli.md) · [Historical engine release](docs/v1-release.json) · [Foreman findings from development](docs/foreman-scratchpad.md)

Maintainer checks:

```sh
npm ci
npm test
npm run typecheck
npm run build
node scripts/verify/skills.mjs
```

The older `verify:v1`/`verify:v1:live` commands concern the governor engine and retained native evaluation evidence, not consumer installation or qualified routing readiness. Some harvested engine calibration checks require a local Foreman source checkout; that is test provenance, not a delegate runtime dependency.
