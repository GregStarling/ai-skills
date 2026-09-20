---
name: ship
description: >-
  Release completed repository work: review scoped changes, commit and integrate,
  push through the required release process, chase CI and publication failures,
  and verify the published result. Use for $ship, /ship, ship these changes,
  commit push and chase, or deploy when the user intends publication.
  Do not activate for deployment advice, preview-only work, or editing this skill.
---

# Ship

Own the path from completed work to a verified release. A pushed commit or a
single green check does not finish a release that still needs publication or
live verification.

## Establish the release

Read repository instructions, working-tree and staged changes, outgoing commits,
remotes, release configuration, and documented checks. Identify the intended
scope and destination from the user's request and repository evidence: integrated
branch, published package, or deployed application. Establish the remote,
branch/channel, artifact/version where applicable, and what will prove success.
Prefer the documented release target; use the remote default branch for a
repository-only release when no other target is specified. Do not assume `main`
is production or invent a deployment service for a repository of files.

An explicit release request authorizes normal commit, push, PR, merge, configured
publication, and necessary in-scope repairs for that destination. Preserve earlier
restrictions such as PR-only or no-deploy. Loading or discussing this skill does
not authorize publishing. Resolve a material ambiguity in scope or destination
before publication; prepare and verify independent work while it is unresolved.

Do not discard or commit unrelated work, expose secrets, force-push, bypass
protection or required approvals, change permissions, perform destructive
migrations, or roll back production without separate authorization. Honor user
stop requests and host limits. Use existing authorized tools and access; do not
change saved settings or install services to get around a blocker.

## Prepare and publish

1. **Review the release diff.** Include outgoing commits as well as working-tree
   edits. Check for credentials, local settings, debug artifacts, and accidental
   generated or large files. Stage only intended changes, using selective staging
   for mixed files. Preserve unrelated staged work too; inspect the exact commit
   contents before committing. Use isolation when needed rather than clearing
   another person's index or discarding their edits.
2. **Keep existing records accurate.** Update relevant PRD, progress, task, or
   lesson files where the repository already uses them. Include meaningful
   records with the work they describe. Do not create a bookkeeping system for
   Ship. Mark release-dependent items complete only after release verification;
   record later evidence separately when committing it would trigger another
   release, and verify any follow-up publication you do make.
3. **Validate and integrate.** Run required repository checks and relevant tests,
   lint, typecheck, build, or packaging checks. Fix in-scope failures. Fetch the
   destination and integrate safely using the repository's conventions. Inspect
   the integrated diff and rerun affected checks after integration, conflict
   resolution, or edits. Do not weaken checks to manufacture green results.
4. **Commit and publish through the normal path.** Preserve existing commits;
   do not automatically reset or squash local history. Use the repository's
   permitted merge strategy and PR/merge queue when required. A feature branch
   alone is not a reason to ask for authorization again. Required human reviews
   or environment approvals remain gates. If direct push is rejected, inspect
   the reason and follow the permitted path instead of bypassing it.
5. **Track the released revision.** Record the pushed commit and the final merged
   or published revision. Squash merges and merge queues can change the SHA.
   Match required checks and deployments to the applicable revision or artifact,
   accounting for the provider's merge-result checks. Never use an unrelated
   latest run or an older green deployment as evidence. Missing, pending,
   cancelled, or unexplained skipped required checks remain unresolved.

If the working tree is clean, inspect unpushed commits and pending release steps.
Continue an unfinished release without manufacturing a new commit. If nothing
needs publication or verification, report no changes; do not invent a new release.

## Chase failures with a stopping rule

Watch all required checks and publication stages using the available provider
tools. Keep the user informed during waits. On failure, read the actual logs,
identify the cause, make a scoped correction, rerun affected local checks and
required review, publish normally, and follow the new revision.

Allow at most **four corrective attempts per invocation**, carrying the count
through context handoffs. Retry an infrastructure failure at most once, and only
when the evidence supports it. Do not republish an immutable package version or
repeat a possibly successful release action blindly: inspect provider state first.
Stop repeating a failed approach when no new hypothesis or progress exists.
Unrelated failures, missing access, required human action, exhausted repair
attempts, or unavailable tools need a precise incomplete-stage report.

Retain the revision, destination, run/publication links, attempts, and remaining
checks in the existing task record or a concise handoff before interruption.
This skill does not run after its host closes or schedule background monitoring.

## Verify what people receive

Verify the requested destination and the changed behavior, not just an HTTP 200:

- **Application:** tie deployment evidence to the released revision, then test the
  changed live flow. Use browser inspection for visible changes when available.
  Use authorized authenticated access where needed. If required live verification
  is unavailable, report it as incomplete rather than substituting local tests.
- **Package or artifact:** confirm the intended registry/channel, version, and
  provenance or digest, then install or fetch it into an isolated consumer and
  exercise the relevant behavior. Avoid altering personal installations.
- **Repository-only:** confirm integration on the remote destination and inspect
  the published files. For installable skills, exercise installation and check
  the installed contents; for rendered documentation, inspect the rendered result.

Confirm the applicable required checks, publication, and verification are complete
for the released revision. Reuse valid evidence for unchanged work; do not rerun
checks merely to fill a report. If CI is genuinely not configured, say so. If a
separate deployment does not apply, say so. An expected check or deployment that
failed to appear is a blocker, not an exemption.

## Compose without duplicate ownership

Discover available companion skills and read their actual instructions. Ship
works independently; no companion, fixed model, provider API, or installation
path is required.

- **CTO** owns the full plan, ledger, and final acceptance. Ship executes its
  authorized release step and returns evidence or the unresolved stage. A Ship
  retry limit does not label CTO's unfinished work complete; CTO may escalate
  using the recorded attempts without blindly restarting the same repair loop.
- **Delegate**, when available, owns routing, risk classification, and required
  independent review. Preserve its assignment identity and review obligations
  through repairs. Do not duplicate completed valid review or waive it to ship.
- **Ponytail**, when available, keeps repairs minimal while preserving scope,
  correctness, and required verification.

## Report with proof

Briefly state what shipped, material fixes during release, and verification
limits. End a completed release with real values and evidence links:

`SHIP PROOF | commit=<released SHA/link> | target=<remote/branch or channel/version> | checks=<local results> | ci=<GREEN + evidence, or N/A + reason> | publish=<VERIFIED + release evidence> | deploy=<GREEN + evidence, or N/A + reason> | live=<VERIFIED + destination and assertion> | at=<UTC timestamp>`

`N/A` is only for genuinely absent or inapplicable stages consistent with the
established destination. Never use it for inaccessible, skipped, failed, or
unverified required work. Never claim an unrun check passed.

When incomplete, end with `SHIP BLOCKED | stage=<stage> | revision=<known SHA> |
reason=<specific failure or limit> | evidence=<links/results> | next=<needed action>`.
A PR-only restriction may be fulfilled with a ready PR, but the release remains
incomplete; report that boundary without a production success proof. For a true
no-op, say no changes and cite any existing release evidence without claiming a
new release. If the user stops the work, report the interruption and last verified
stage plainly.
