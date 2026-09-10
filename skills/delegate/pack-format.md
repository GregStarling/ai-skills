# Read the portable routing pack

The installed consumer accepts `routing_pack.v3`. Older versions require recompiling and reinstalling the complete delegate folder; do not reinterpret a v2 pack as v3. Never dispatch from malformed, unresolved, tampered or `simulation_test` data. No runtime Node dependency is required: use the host's native file-reading, search and date tools.

## Lookup

Read pack metadata, the relevant `routes[]` entry and only its referenced `treatments`. The published file keeps one treatment and one route per line for selective search.

`treatments` is an object keyed by exact `candidate_identity`. Each value stores provider/model/snapshot, effort, serving settings, family/frontier status, capabilities and context capacity once. Its `provisional` field, when present, contains shared native-host smoke observations, official availability/pricing and control limitations.

Each route holds `workers`, `reviewers`, `requirements`, `review_rule`, `ranking_basis` and the governed decisions. Its `stratum` holds scope, risk, constraints, execution environment and evaluation metadata, not candidate arrays. Ordered worker/reviewer entries reference a `candidate_identity` and retain their own candidate ID, evidence tier, observation/expiry, qualification and `task_evidence`. Resolve each reference against `treatments`; do not assume an absent field is supported or borrow authority from another route using the same model.

For provisional entries, combine shared `provisional` host/smoke controls with that entry's `task_evidence`. Installed acceptance must match this class, host, exact treatment identity and worker/reviewer role. Preserve any recovery limitations. Shared smoke success alone remains smoke extrapolation; qualification and installed acceptance are route-specific.

## Eligibility and ordering

Match the task's scope, risk and constraints exactly before intersecting with the host's actual selectable treatments. Check model/snapshot, effort, material serving settings, required capabilities/tools, context and fresh-context support for each candidate. A matching API provider/model does not prove that a Claude Code or Codex host can execute the treatment. Qualified host evidence must match the route's execution environment; API execution evidence cannot silently establish native-host eligibility.

Apply this order independently to worker and reviewer lanes:

1. Eligible qualified treatments, preserving any governed retained incumbent.
2. Provisional treatments with matching installed task acceptance.
3. Provisional smoke extrapolation within its declared scope.

Economics apply within each level. Use supplied measured API-equivalent task economics when comparable, otherwise comparable official API prices, otherwise explicit maintainer order with unknown economics. Advertised input/output rates are comparable only when their ordering does not cross; do not invent a token mix. A cheaper smoke-only model must not precede eligible matching installed acceptance. Provisional evidence is not governor qualification. Never claim measured cheapest completion from advertised prices or maintainer order. A provisional route without measured task economics cannot satisfy an explicit task dollar ceiling.

Before dispatch, ensure an eligible frontier reviewer exists and satisfies the route's different-model, different-family and fresh-context rules. Do not infer family identity or unknown controls. Requested/configured settings and runtime-observed settings remain distinct. Where effort is `not_applicable`, omit the override; a missing observation does not authorize an arbitrary host default.

A failed or unavailable treatment falls back to the next eligible entry at the correct evidence level. Keep evidence tier separate for each lane; failure does not grant eligibility to a treatment that failed capability requirements.

V5 qualified entries include compiler-derived `qualification.identity_assurance`: model and effort evidence, overall assurance, execution environment, evidence digest and limitations. Use this summary without re-deriving raw qualification. Configuration attestation establishes exact accepted host settings; it does not claim hidden served telemetry or provider-side fallback control. If current host evidence contradicts model/effort or reports substitution, reject that treatment and record the contradiction for refresh. Never write an assurance label into an observation to make it eligible.

## Time and integrity

Use the host clock and date comparison tools for `refresh_after`, pack `expires_at` and each entry's `expires_at`. Report refresh due and continue until hard pack expiry using only unexpired evidence. One expired treatment does not disable valid alternatives. Publication validation owns the future-`generated_at` check; do not infer publication validity from the session calendar date.

The compiler validates every reference, exact identity, route evidence and the complete wire `content_digest`. The digest covers shared treatments and route entries together. Shared metadata conflicts fail compilation; recompilation never mutates stored source evidence. If you cannot establish a valid matching route and frontier reviewer, report the precise gap and retain useful planning.
