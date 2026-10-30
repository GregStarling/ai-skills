# AUDIT.md template

Keep the sections and their order. Number proposals continuously (P1, P2, ...)
so the user can approve by number. Quote before and after text exactly.

```markdown
# Skill audit — <YYYY-MM-DD>

Scope: <folders, or "all installed">. Checked against: <n> installed neighbours.
Snapshot: <path>. Branch: <name or "not a repository">.

## Summary

| Skills in scope | Audited (editable) | Report-only | Lint FAIL before | After mechanical fixes | Collisions | Same-name | Proposals |
| --- | --- | --- | --- | --- | --- | --- | --- |

## Mechanical fixes made

| Skill | File | Fix | Lint rule |
| --- | --- | --- | --- |

## Proposed changes

### P1 — <skill>: <short title>
Rule: <review-rules heading or lint rule>. Evidence: <what showed the problem>.
Before:
> <exact current text>
After:
> <exact proposed text>

## Collisions

| Pair | Request both would claim | Resolution | Proposal |
| --- | --- | --- | --- |

## Same-name clashes

| Name | In scope | Other copy | Effect (shadowed, stale copy, namespaced) | Proposal |
| --- | --- | --- | --- | --- |

## Report-only findings

| Skill | Owner to fix (generator, upstream, repository) | Finding | Rule |
| --- | --- | --- | --- |

## Trigger-test plan

Sets: before = snapshot copies of the changed skills plus neighbours <list>;
after = edited skills plus the same neighbours; without = neighbours alone
(always when the scope was named).
Cases: <n>. Runs per case: 3. Sessions: <n>. Model: opus.
```

## Trigger-test plan file

Save next to AUDIT.md as `trigger-plan.json`. Point `before` and `after` at
flat folders that each contain one folder per skill. They hold the same
neighbours and differ only in the changed skills, so any difference in
results comes from the change. When the scope was named, add
`"without": "<flat folder: the same neighbours alone>"`; compare each neighbour
case across all three sets. `expect` is the skill name, or `null` when no
skill should fire.

```json
{
  "sets": {"before": "<flat folder: snapshot copies of changed skills plus neighbours>", "after": "<flat folder: edited skills plus the same neighbours>"},
  "runs": 3,
  "model": "opus",
  "cases": [
    {"id": "focus-explicit", "prompt": "Rename parseDate everywhere. Just do what I asked, nothing else.", "expect": "focus"},
    {"id": "focus-near-miss", "prompt": "Rename parseDate everywhere.", "expect": null}
  ]
}
```
