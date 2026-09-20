# Design Director import

Source: [GregStarling/design-director at fdde874](https://github.com/GregStarling/design-director/tree/fdde87494b4f6ccefc6cce9ebff6c7c396cb459d).

The collection imports the complete `skills/design-director` folder and includes
its upstream MIT license in the consumer bundle. The six reference documents,
validator, and host metadata remain byte-for-byte identical to upstream.
SKILL.md only clarifies validator invocation: resolve the installed skill path
and the project's proposal path, rather than assuming the current directory is
the skill folder. The added README uses the collection's standard installer and
keeps the distinction between structural validation and actual design evidence.

No custom installer is imported. No new package dependency, constitution storage,
provider service, personal installation change, upstream retirement, or design
policy revision is part of this migration. Existing skills are unchanged.

## Validation

- Upstream equality checks passed for all six reference guides, the validator,
  host metadata, and MIT license. The only imported instruction change is the
  validator-path clarification described above.
- Nine retained validator contract tests cover all four resolution types and
  rejection of floor changes, heuristic promotion to established authority,
  mismatched rollback revisions, unrelated amendment evidence, and unknown surfaces.
- Full repository suite: 922 passed, 3 existing skips, 50 test files. Typecheck,
  build, portable packaging, skill-format, link, and whitespace checks passed.
- Disposable Skills CLI installations of Design Director alone and all six
  consumer skills succeeded for Codex and Claude Code. Every installed file
  matched its source. Both hosts' installed validators accepted a valid fixture
  and rejected an invalid one from the consumer project directory.
- Existing consumer skill folders remain unchanged; no personal installation or
  saved setting was changed.

Synthetic validator contract fixtures establish structural behavior only, not
real product design quality. This migration does not claim a new rendered design
evaluation, live host-runtime adoption, or production deployment.
