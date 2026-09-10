# Real harvested evaluations

The two versioned fixture bundles use actual Foreman parent commits and the fixed historical regression tests. Prompts are explicitly reconstructed from commit/test provenance; original user prompts were not recovered. They cover bounded backend work and hard debugging only.

`prepareFixture` exports the pinned parent into a fresh candidate directory. It withholds tests, historical Git history, workflow instructions, dependency caches and known fixes. `gradeFixture` reconstructs a separate evaluator after execution, copies only allowed candidate implementation files, installs the immutable held-out graders, and runs the actual tests. A file-by-file digest/mode comparison rejects added, deleted, symlinked or modified paths outside the declared scope. Grader bytes are checked before and after execution. Dependency reuse requires the exact pinned package-lock digest and is confined to the evaluator.

The evaluator runs project code locally. Its separate directory and integrity checks provide grading isolation, not a security boundary against arbitrary hostile code. Native candidate execution must use the provider runtime's enforced workspace sandbox. Only run these trusted historical fixtures and authorized candidate changes; do not treat a directory as an OS sandbox.

A passing historical fix demonstrates grader calibration, not model quality. Objective test passes also do not claim policy acceptance: `GraderResult.accepted` remains false until a separate governed acceptance and required independent review are recorded. Missing provider identity or cost stays unknown.

Reproduce calibration after building:

```
node scripts/verify/real-fixtures.mjs --source /path/to/ai-foreman --output /tmp/calibration.json
```

Optional `--dependency-directory /path/to/isolated/node_modules` reuses a dependency tree whose adjacent lockfile matches the pinned fixture. The source Git checkout is read only. The calibration report identifies both named failing-parent and passing-known-fix runs, retains their raw reports and hashes, and explicitly marks the result as zero model calls. Calibration candidate directories contain known solutions afterward and must never be reused for model evaluation.
