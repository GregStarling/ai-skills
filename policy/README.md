# Human governance policy

`constitution.json` declares versioned roles, task classes, categorical risk signals, review requirements, qualification ceilings/floors, promotion thresholds and binding expiry. It contains no provider model IDs. Candidate identities and changing availability belong to the registry.

The initial thresholds are explicitly proposed engineering defaults, not measured model-performance claims. Policy changes require a new version and regenerate the policy digest used by decisions and bindings. Version 2's two active classes cover bounded backend work and hard debugging and reference the two real harvested fixture buckets. `simulation-v1.json` preserves the earlier policy embedded in the synthetic binding examples; those examples cannot qualify production candidates. Shadow defaults to disabled until explicitly enabled in human policy, and runtime safety checks still apply after enablement.

Qualification consumes exact raw task observations, their source bytes and, in production, captured runtime receipts and executed grader results. Every worker, review and rework attempt counts toward cost per accepted task. Unknown cost, insufficient samples, stale evidence, or unknown served snapshot/effort yields HOLD; mismatched treatment or a violated hard requirement rejects qualification.

Initial selection chooses the cheapest qualified candidate. Incumbent replacement additionally requires same-task paired evidence, a declared statistical interval and the applicable economic threshold. A retained incumbent is not evidence that a challenger failed in general.

Binding validation reconstructs the decision from raw inputs and separately checks current eligibility. Soft expiry is reported as STALE; hard expiry is invalid. The runtime remains responsible for supplying actual observed changes and captured independent review evidence.

Run `node dist/cli/index.js validate-policy policy/constitution.json` after building. `fixtures/bindings/manifest.json` enumerates complete synthetic request/binding envelopes used by the executable foundation verifier.
