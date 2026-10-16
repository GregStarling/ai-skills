# The routing pack

`lookup` reads `routing-pack.json` (`routing_pack.v3`, production mode, content digest recomputed, validity window checked) and returns: `pack` (`content_digest`, `refresh_due`, `refresh_after`, `expires_at`); `route` (`shape`, `scope`, `review_rule`, `tools`, `stratum_digest`); ordered `workers` and `reviewers` (`candidate_id`, `model`, `effort`, `serving`, `evidence_tier`, `basis`, `expires_at`); `limitations`; `host_checks`; `gap`.

Apply the current [model policy](SKILL.md#roles) before using this optional evidence path. Supply
`host_treatments` containing only selectable, permitted treatments: exclude Fable for every role,
and exclude Astra unless the stuck-build rescue conditions are met. Do not launch candidates from
the unfiltered default roster. Use permitted entries in order, preserving all evidence and review
constraints. If the pack has no permitted reviewer, report the evidence route unavailable; use
ordinary primary-frontier routing only when evidence-qualified routing was not required. Do not
relabel old Astra or Fable evidence as Sol or Opus evidence, or treat a low-effort Sol observation
as high-effort qualification. Historical pack entries do not change the current model policy.

Host checks, on the actual host: model selectable; effort expressible (omit when `not_applicable`); fresh process available when `review_rule.fresh_context`. A `not_applicable` effort means no effort was requested, so the served host default is unobserved; such a treatment stays provisional and is never qualified.

The reviewer must satisfy the route's different-model, different-family and fresh-context rules; never infer family identity. One expired entry (`expires_at`) does not disable the others; the pack's own `expires_at` ends all routing, and `refresh_due` only asks for a refresh.

Fallback without `node` (one route per line, one treatment per line):

```
grep -n '"public_task_class":"<class>"' routing-pack.json | grep '"risk":"<risk>"' | grep '"host":"<host>"'
grep -o '"candidate_id":"[^"]*","candidate_identity":"[^"]*"' <that line>   # workers then reviewers, in order
grep -o '"expires_at":"[^"]*"' <that line>; date -u  # every entry must be unexpired
grep -n '"<candidate_identity>"' routing-pack.json   # treatment line: model, effort, serving
```

The fallback cannot verify the content digest or apply the ladder; say so.
