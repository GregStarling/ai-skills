# Subscription-host identity assurance

V5 changes the identity evidence accepted for capability qualification. It does
not change v4 API-equivalent economics, task thresholds, review rules, promotion
statistics or task scope. The exact previous policy is `constitution-v4.json`;
`constitution-v3.json` is unchanged.

`deriveIdentityAssurance` resolves the original harness request, process capture,
host-version stdout, configuration files and host trace by their byte digests.
The request is captured before execution. The validator parses CLI arguments,
checks the exact candidate/environment/invocation, verifies process and trace
lineage, and requires actual executed host events. Unresolved or contradictory
inputs cannot establish assurance. Caller-written `observed_identity` cannot
upgrade native assurance; a conflicting claim still fails closed. Observations
and runtime reports reject an `identity_assurance` field.

The request also captures material child-environment presence before execution.
Provider redirects and conflicting model/effort overrides are rejected; credentials
and endpoint values are never retained. Older captures without this evidence
remain incomplete. Settings files are resolved by digest and restricted to the
supported configuration surface; hash integrity alone cannot authorize overrides.

The returned fields keep model and effort separate:

| Derived level | Required evidence |
| --- | --- |
| `RUNTIME_ATTESTED` | Every applicable identity field independently exposed by runtime events |
| `PARTIALLY_RUNTIME_ATTESTED` | Runtime exposes some fields; preserved accepted configuration establishes the rest |
| `CONFIGURATION_ATTESTED` | Exact accepted native configuration and execution, without stronger served telemetry |
| `UNVERIFIED` | Missing, unresolved, rejected or contradictory identity evidence |

An effort control genuinely absent from the registered treatment is
`not_applicable`; thinking-token counts never establish effort. Future explicit
served-model/effort fields automatically strengthen the result. Tool results,
assistant prose, configuration echoes and auxiliary billing models do not.
An exact configured model different from observed serving, contradictory effort,
or reported substitution invalidates the evidence rather than reducing assurance.

Low and medium risk require configuration attestation or stronger. Medium still
requires a different model, fresh context and frontier verification. High and
critical retain runtime attestation, immutable pinning and existing stronger
review/serving guards; the portable pack does not gain those scopes.

A v5 native low/medium candidate may use a verified canonical host identifier
with `model_id == snapshot_id` even when registry `immutable_snapshot` is null.
This is an exact configured host treatment, not a claim of an immutable provider
snapshot. Official/registry provenance, supported effort/material settings and
alias rejection remain mandatory. Configuration-only convenience aliases cannot
qualify; Claude aliases can resolve through actual canonical response identity.

The legacy `serving.fallback: disabled` value identifies the requested native
treatment with no configured fallback. The derived limitation explicitly says
that provider-side fallback state is not independently attested. It does not
assert that the provider disabled fallback. An explicit fallback configuration
or observed substitution is rejected. This uncertainty is admitted only under
the applicable risk policy.

Raw receipts remain `PENDING_EVIDENCE`. Independent assessment validates every
worker/rework/review capture, artifact and review boundary before producing
observations. Configuration claims in the receipt itself grant no authority.
The existing grader/source trust boundary remains: hashes prove integrity and
lineage, not authenticity of arbitrary files authored by an agent. Maintainers
must obtain captures from the native harness; this system does not cryptographically
authenticate a remote machine or accept self-written trace files as real runs.

Qualified bindings and route qualifications carry the weakest field assurance
among counted observations, a digest of that evidence and its limitations.
Binding validation independently recomputes the summary; the portable consumer
uses compiler output and still checks current exact host availability. Stronger
contradictory current evidence excludes a treatment immediately. API evidence
remains confined to API capability and separately sourced economic ordering.

Twenty independent tasks, 90% acceptance, latency, freshness, failure ceilings
and review remain required. More than one version of the same task cannot raise
the sample count. Synthetic reachability tests demonstrate the code path, not
real qualification or reviewer competence.
