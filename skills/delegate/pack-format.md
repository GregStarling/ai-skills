# The routing pack

`lookup` reads `routing-pack.json` (`routing_pack.v3`, production mode, content digest recomputed, validity window checked) and returns: `pack` (`content_digest`, `refresh_due`, `refresh_after`, `expires_at`); `route` (`shape`, `scope`, `review_rule`, `tools`, `stratum_digest`); ordered `workers` and `reviewers` (`candidate_id`, `model`, `effort`, `serving`, `evidence_tier`, `basis`, `expires_at`); `limitations`; `host_checks`; `gap`. Use entries in the order given.

Host checks, on the actual host: model selectable; effort expressible (omit when `not_applicable`); fresh process available when `review_rule.fresh_context`.

The reviewer must satisfy the route's different-model, different-family and fresh-context rules; never infer family identity. One expired entry (`expires_at`) does not disable the others; the pack's own `expires_at` ends all routing, and `refresh_due` only asks for a refresh.

Fallback without `node` (one route per line, one treatment per line):

```
grep -n '"public_task_class":"<class>"' routing-pack.json | grep '"risk":"<risk>"' | grep '"host":"<host>"'
grep -o '"candidate_id":"[^"]*","candidate_identity":"[^"]*"' <that line>   # workers then reviewers, in order
grep -o '"expires_at":"[^"]*"' <that line>; date -u  # every entry must be unexpired
grep -n '"<candidate_identity>"' routing-pack.json   # treatment line: model, effort, serving
```

The fallback cannot verify the content digest or apply the ladder; say so.
