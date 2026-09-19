# Skill collection — 2026-09-19

## Plan and acceptance

1. Make the root README a catalog; retain the full Delegate overview under docs.
2. Give CTO and Delegate their own independently installable consumer folders and
   concise READMEs. Import reviewed CTO behavior without host-specific paths.
3. Document individual and combined installs using the existing open skills CLI,
   plus manual copies. No custom installer, service, or new runtime dependency.
4. Discover skills dynamically in the packaging check; verify consumer references
   from isolated copies and preserve Delegate-specific pack/integrity checks.
5. Test discovery and actual project installs for both hosts in disposable folders;
   run regression tests, typecheck, build, packaging and independent review.
6. Publish a reviewable branch and pull request to the existing GitHub repository.

No engine relocation, routing-policy change, historical-evidence rewrite, personal
installation update, or saved-model change is required. refresh-models remains a
clearly labeled maintainer workflow requiring the repository.

## Validation

- Full repository suite: 913 passed, 3 pre-existing skips, 49 test files.
- Typecheck, build, portable packaging, routing-pack publication check and
  `git diff --check`: passed.
- Added a regression case proving a new skill is discovered without registration
  and missing/out-of-folder references in consumer bundles are rejected.
- Skills CLI 1.7.0 `--list`: discovers CTO, Delegate and the labeled maintainer
  workflow. Actual `--copy` installs of CTO alone, Delegate alone and both were
  exercised in disposable projects for Codex and Claude Code. Every installed
  file matched the corresponding source bytes.
- Installed Delegate helper executed successfully and retained required frontier
  review for a medium-risk implementation.
- Codex CLI 0.154.0 native `skills/list`: all three disposable projects expose
  exactly their selected project-scope skills, enabled.
- Claude Code 2.1.267: native `/cto` invocation succeeded from the installed
  project copy with `--setting-sources project,local`. Both CTO and Delegate
  appeared in the skill inventory. The default-source check correctly selected
  the existing personal CTO copy because personal skills outrank project copies;
  installation docs now explain this precedence. No saved settings were changed.
- Skill Creator validation passed for CTO. Its previously reviewed instructions,
  references and metadata match the original source byte-for-byte. All preexisting
  Delegate files, including its routing pack, are byte-for-byte unchanged; only
  a README was added. The validation index records its new folder digest while
  retaining the old digest as history.
- Fresh independent review: PASS; relocation link cleanup applied. This review
  and installation validation do not establish new model capability or savings.

The existing CTO behavioral validation included eight positive/four negative
semantic trigger scenarios, seven decision scenarios and an isolated build that
went from three failures to five passing unchanged tests. This collection change
preserves that behavior; its new live checks exercise packaging and discovery.
No deployment or paid-resource workflow was executed.
