# Bound the assignment, not the repository

Use this for unfamiliar or large repositories, cross-package changes, investigation and visual inspection. There is no language, repository-size or fixed file-count ceiling. A useful assignment has a question or outcome, a discoverable source area, permitted actions, a stopping point and a checkable return.

## Locate → trace → change → integrate

- **Locate:** Start from the user's symbol, symptom, endpoint, screen or feature. Use repository guidance, manifests, workspace/package maps and filename/symbol search to identify the likely owner directly. Delegate a read-only locate assignment only when that search would sprawl across several packages; never map the whole repository first.
- **Trace:** Follow the relevant call/data path across package boundaries. Return the owner, callers, shared types/contracts, configuration or generated-code source, nearby tests and exact evidence locations. Distinguish verified dependencies from unresolved ones. Widen search progressively when evidence requires it; do not repeatedly scan everything or arbitrarily stop at one package.
- **Change:** Give one worker a coherent behavior change with explicit write ownership and acceptance checks. Read scope can be broader than write scope. Settle interfaces before dividing dependent changes. Do not split by file count: a shared-function change and its callers may belong together. A discovery outside write ownership returns a proposed scope adjustment, not an unauthorized edit.
- **Integrate:** Check affected consumers, shared contracts, exports, build targets and critical flows. Run focused tests during iteration, then repository-required and affected integration checks before acceptance. If impact is unclear, widen dependency inspection and testing. Never infer safety from one package's green test.

A feature may begin with finding an existing pattern, then defining the interface and assigning implementation. A tweak may go straight to a precise edit when the affected callers are known. A bug may start with source location, then authorized local reproduction, frontier acceptance of the cause, a fix and regression verification. Unknown answers are expected; unresolved consequential choices return to the frontier with evidence.

## Keep context useful

Give the worker paths, symbols, commands, constraints and the smallest necessary history, not a repository dump or full conversation. Bound search output and page through decisive matches. Exclude dependencies/build outputs unless relevant. Follow applicable repository instructions; an assignment cannot loosen permissions.

Stop an investigator when the question is answered, a consequential decision is needed, access is blocked or searching no longer produces new evidence. Return findings with source locations, checks, uncertainties and the smallest next step. Preserve its useful context for follow-ups; do not restart the search at the frontier. Increase model strength when reasoning—not missing access or an unclear task—is the constraint.

Prefer text/DOM inspection for structure, screenshots for visual judgment. Preserve artifacts by reference and avoid redundant captures. A worker's screenshot verdict cannot replace frontier inspection needed for acceptance. Read [research.md](research.md) for source-based research.

At a meaningful delivery boundary, use a short handoff containing objective, constraints, decisions, checkout state, completed checks, evidence and remaining risks. Keep a coherent investigation together when restarting would cause rediscovery; a full-history fork is not a compact handoff. Do not create recording just to trigger session reminders.
