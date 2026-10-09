import {afterEach, describe, expect, it} from 'vitest';
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

const validator = resolve('skills/checklist/scripts/validate-checklist.mjs');
const temporary: string[] = [];
afterEach(() => { for (const path of temporary.splice(0)) rmSync(path, {recursive: true, force: true}); });

// Synthetic contract fixtures: they prove the record checks, not that any real work was verified.
const complete = `# Checklist: fixture

## Request

- Objective: fixture request.

## Definition of Complete

- The fixture outcome is verified.

## Items

### Group

- [x] C-001 [build] First outcome.
  - Source: Explicit requirement.
  - Accept: First condition holds.
  - Verify: Run the first check.
  - Evidence: rev abc123: \`npm test\` 4 passed.
  - Depends on: None.
- [x] C-002 [release] Published outcome.
  - Source: Explicit requirement.
  - Accept: Published condition holds.
  - Verify: Inspect the published result.
  - Evidence: Release v1.2.0 page shows the change at 2026-10-09T10:00Z.
  - Depends on: C-001.

## Decisions

- None material.

## Pre-Mortem

- P1: covered by C-001.

## Exclusions

- None.

## Change Log

- 2026-10-09T09:00Z Created C-001 and C-002.

## Verification

- 2026-10-09 rev abc123: npm test passed.

## Close-Out

- Review: independent — fresh reviewer given the request and diff.
- Inventory: recorded in review.md before comparison.
- Result: PASS, no open findings.

## Resume

- State: complete.
`;

const C2 = `- [x] C-002 [release] Published outcome.
  - Source: Explicit requirement.
  - Accept: Published condition holds.
  - Verify: Inspect the published result.
  - Evidence: Release v1.2.0 page shows the change at 2026-10-09T10:00Z.
  - Depends on: C-001.`;
const withC2 = (replacement: string, text = complete) => text.replace(C2, replacement);
const exception = (status: string, {reason = 'Specific reason for the exception.', authority = 'Registry policy: owner approval required (issue #51).' as string | null} = {}) => withC2(`- [ ] C-002 [release] Published outcome.
  - Source: Explicit requirement.
  - Accept: Published condition holds.
  - Verify: Inspect the published result.
  - Evidence: Registry approval requested in issue #51 on 2026-10-09.
  - Depends on: C-001.
  - Status: ${status}${reason === null ? '' : `\n  - Reason: ${reason}`}${authority === null ? '' : `\n  - Authority: ${authority}`}`);
const logged = (text: string, entry: string) => text.replace('- 2026-10-09T09:00Z Created C-001 and C-002.', `- 2026-10-09T09:00Z Created C-001 and C-002.\n${entry}`);
const closeOut = (lines: string, text = complete) => text.replace(/## Close-Out\n\n[\s\S]*?\n\n## Resume/, `## Close-Out\n\n${lines}\n\n## Resume`);
const evidence = (value: string) => complete.replace('rev abc123: `npm test` 4 passed.', value);
const PASSED = '- Review: independent — fresh reviewer.\n- Inventory: inventory.md\n- Result: PASS.';

function run(text: string, args: string[] = [], baseline?: string) {
 const cwd = mkdtempSync(join(tmpdir(), 'checklist-validator-')); temporary.push(cwd);
 writeFileSync(join(cwd, 'checklist.md'), text);
 if (baseline !== undefined) writeFileSync(join(cwd, 'baseline.md'), baseline);
 // The installed helper must work from a consumer directory with no package.json.
 return spawnSync(process.execPath, [validator, 'checklist.md', ...args], {cwd, encoding: 'utf8'});
}

describe('portable Checklist validator: statuses', () => {
 it('accepts a verified record and reports real counts per stage', () => {
  const result = run(complete);
  expect(result.status, result.stderr).toBe(0);
  expect(result.stdout).toBe('CHECKLIST VERIFIED COMPLETE | verified=2/2 | open=none | blocked=none | waived=none | not_applicable=none | findings_open=none | review=independent | build=1/1 | release=1/1 | file=checklist.md\n');
 });
 it('accepts CRLF, * and + bullets, tabs or extra spaces after bullets, deeper fields, indented headings and wrapped evidence', () => {
  const text = complete.replace(/^- \[x\] C-001/m, '*\t[x] C-001').replace(/^- \[x\] C-002/m, '+  [x] C-002').replace('## Items', ' ## Items')
   .replace(/^  - /gm, '   * ').replace('`npm test` 4 passed.', '`npm test` 4 passed,\n      - output saved at logs/test.txt').replace(/\n/g, '\r\n');
  const result = run(text); expect(result.status, result.stderr).toBe(0);
  expect(result.stdout).toContain('CHECKLIST VERIFIED COMPLETE | verified=2/2');
 });
 it('treats a column-0 wrapped line as a continuation, keeping the fields after it attached', () => {
  const wrapped = complete.replace('Evidence: Release v1.2.0 page shows the change at 2026-10-09T10:00Z.', 'Evidence: Release v1.2.0 page shows the change\nat 2026-10-09T10:00Z.');
  expect(run(wrapped).status).toBe(0);
  const hidden = run(wrapped.replace('  - Depends on: C-001.', '  - Depends on: C-001.\n  - Status: BLOCKED\n  - Reason: x.'));
  expect(hidden.status).toBe(1); expect(hidden.stderr).toContain('C-002: an exception keeps its box unchecked');
 });
 it("accepts the guiding prompt's sample items once each carries a checkbox", () => {
  const sample = `* [ ] C-001 [build] A valid record remains available after page reload.
   * Source: Explicit requirement.
   * Accept: The submitted record is persisted and returned accurately after reload.
   * Verify: Execute the create-and-reload workflow and compare the saved data.
   * Evidence: Pending.
   * Depends on: None.
* [ ] C-002 [build] Invalid submissions preserve previously entered valid data.
   * Source: Implied, input validation.
   * Accept: The user receives an actionable error without losing valid inputs.
   * Verify: Submit malformed data and inspect the resulting application state.
   * Evidence: Pending.
   * Depends on: C-001.
* [ ] C-003 [release] The published application supports the verified primary workflow.
   * Source: Authorized release requirement.
   * Accept: The released revision successfully executes the workflow.
   * Verify: Test the published application and identify the deployed revision.
   * Evidence: Pending.
   * Depends on: C-001, C-002.`;
  const result = run(complete.replace(/### Group\n\n[\s\S]*?\n\n## Decisions/, `${sample}\n\n## Decisions`));
  expect(result.status, result.stderr).toBe(2);
  expect(result.stdout).toContain('CHECKLIST OPEN | verified=0/3 | open=C-001,C-002,C-003');
  expect(result.stdout).toContain('build=0/2 | release=0/1');
 });
 it('accepts text that merely starts with a placeholder word, and non-Latin text', () => {
  expect(run(complete.replace('Accept: First condition holds.', 'Accept: Todo items persist after reload.')).status).toBe(0);
  expect(run(evidence('Pending-orders test `npm test -- pending` passed 3/3 at rev abc123.')).status).toBe(0);
  expect(run(complete.replace('Accept: First condition holds.', 'Accept: Список файлов совпадает с экспортом.')).status).toBe(0);
  expect(run(complete.replace('Depends on: None.', 'Depends on: None (standalone).')).status).toBe(0);
 });
 it('keeps the record open while any required item is unchecked, including release items', () => {
  const result = run(withC2(C2.replace('[x]', '[ ]')));
  expect(result.status).toBe(2);
  expect(result.stdout).toContain('CHECKLIST OPEN | verified=1/2 | open=C-002');
  expect(result.stdout).toContain('build=1/1 | release=0/1');
 });
 it('reports a user waiver as accepted with exceptions, never verified complete', () => {
  const result = run(logged(exception('WAIVED', {authority: 'User message 2026-10-09 removing C-002.'}), '- 2026-10-09T11:00Z Waived C-002 per user.'));
  expect(result.status, result.stderr).toBe(0);
  expect(result.stdout).toContain('CHECKLIST ACCEPTED WITH EXCEPTIONS | verified=1/2 | open=none | blocked=none | waived=C-002');
 });
 it('reports blocked only after the review, when every remaining item is externally blocked', () => {
  const blocked = run(exception('BLOCKED'));
  expect(blocked.status, blocked.stderr).toBe(2); expect(blocked.stdout).toContain('CHECKLIST BLOCKED | verified=1/2 | open=none | blocked=C-002');
  const reviewPending = run(closeOut('- Review: pending\n- Inventory: pending\n- Result: pending', exception('BLOCKED')));
  expect(reviewPending.status).toBe(2); expect(reviewPending.stdout).toContain('CHECKLIST OPEN | verified=1/2 | open=none | blocked=C-002');
  const mixed = run(exception('BLOCKED').replace('- [x] C-001', '- [ ] C-001').replace('Depends on: C-001.', 'Depends on: None.'));
  expect(mixed.status).toBe(2); expect(mixed.stdout).toContain('CHECKLIST OPEN | verified=0/2 | open=C-001 | blocked=C-002');
 });
 it('removes evidence-backed non-applicable items from the denominator and lists them', () => {
  for (const entry of ['- 2026-10-09T11:00Z C-002 not applicable: no publication.', '- 2026-10-09T11:00Z C-002 does not apply: the brief excludes publication.']) {
   const result = run(logged(exception('NOT APPLICABLE', {authority: 'Product brief section 2 excludes publication.'}), entry));
   expect(result.status, result.stderr).toBe(0);
   expect(result.stdout).toContain('CHECKLIST VERIFIED COMPLETE | verified=1/1 | open=none | blocked=none | waived=none | not_applicable=C-002');
   expect(result.stdout).toContain('release=0/0');
  }
 });
 it.each([
  ['Review', '- Review: pending\n- Inventory: recorded in review.md before comparison.\n- Result: PASS, no open findings.'],
  ['Inventory', '- Review: independent — fresh reviewer.\n- Inventory: not recorded yet\n- Result: PASS, no open findings.'],
  ['Result', '- Review: independent — fresh reviewer.\n- Inventory: recorded in review.md.\n- Result: TBD'],
  ['a failing Result', '- Review: independent — fresh reviewer.\n- Inventory: recorded in review.md.\n- Result: FAIL — three material findings remain unresolved.'],
  ['all review fields', '- Notes only.'],
 ])('keeps the record open until the close-out %s is recorded as passed', (_name, lines) => {
  const result = run(closeOut(lines)); expect(result.status, result.stderr).toBe(2);
  expect(result.stdout).toContain('CHECKLIST OPEN | verified=2/2 | open=none'); expect(result.stdout).toContain('review=pending');
 });
 it('ignores fields hidden in HTML comments', () => {
  const result = run(closeOut('- Review: pending\n- Inventory: pending\n- Result: pending\n\n<!--\n- Review: independent — x.\n- Inventory: y.md\n- Result: PASS.\n-->'));
  expect(result.status).toBe(2); expect(result.stdout).toContain('review=pending');
 });
 it('keeps the record open while a close-out finding is unresolved, and accepts resolved findings', () => {
  const base = '- Review: self (not independent) — fresh inventory first.\n- Inventory: inventory.md\n- Result: PASS after fixes.\n\n';
  const open = run(closeOut(base + '- [ ] F-001 Read-only directory reports success.'));
  expect(open.status).toBe(2); expect(open.stdout).toContain('findings_open=F-001');
  const resolved = run(closeOut(base + '- [x] F-001 Read-only directory reports success.\n  - Resolution: Added C-003; fixed at rev def456.'));
  expect(resolved.status, resolved.stderr).toBe(0); expect(resolved.stdout).toContain('review=self');
 });
 it('counts items that render despite unusual fences or invisible characters', () => {
  const extra = '- [ ] C-003 [build] Data is preserved on retry.\n  - Source: Pre-mortem P1.\n  - Accept: Retry keeps data.\n  - Verify: Retry test.\n  - Evidence: Pending.';
  const item = (prefix: string, suffix = '') => complete.replace('\n## Decisions', `${prefix}${extra}${suffix}\n\n## Decisions`);
  for (const text of [item('\n```note``` items below are tracked here\n\n', '\n\n```end``` of tracked items'),
   complete.replace('  - Depends on: None.', '  - Depends on: None.\n  ```\n  output').replace('\n## Decisions', `${extra}\n\n## Decisions`),
   item('\n​')]) {
   const result = run(text); expect(result.status, result.stderr).toBe(2); expect(result.stdout).toContain('open=C-003');
  }
 });
});

describe('portable Checklist validator: structural gate', () => {
 const hide = (prefix: string) => complete.replace('\n## Decisions', `\n${prefix}- [ ] C-003 [build] Data is preserved on retry.\n  - Source: Pre-mortem P1.\n  - Accept: Retry keeps data.\n  - Verify: Retry test.\n  - Evidence: Pending.\n\n## Decisions`);
 const invalid: Array<[string, string, string]> = [
  ['duplicate IDs', withC2(C2.replace('C-002 [release]', 'C-001 [release]').replace('Depends on: C-001.', 'Depends on: None.')), 'duplicate item ID C-001'],
  ['missing Source', complete.replace('  - Source: Explicit requirement.\n  - Accept: First', '  - Accept: First'), 'C-001: needs Source'],
  ['missing Accept', complete.replace('  - Accept: First condition holds.\n', ''), 'C-001: needs Accept'],
  ['placeholder Verify', complete.replace('Verify: Run the first check.', 'Verify: TBD'), 'C-001: needs Verify'],
  ['missing Evidence field', complete.replace('  - Evidence: rev abc123: `npm test` 4 passed.\n', ''), 'C-001: needs an Evidence field'],
  ...['Pending.', '', 'All tests passed.', 'All unit tests passed.', 'Verified manually.', 'Not tested.', 'Not run yet.', 'Skipped.', 'TBA, will add.',
   'To be determined.', 'None yet.', 'N/A - not run yet.', 'Should work.', 'Works on my machine.', 'CI is green.', 'Done 1.']
   .map((value): [string, string, string] => [`evidence "${value}" on a checked item`, evidence(value), 'checked item needs evidence']),
  ...['STALE: rev abc123 npm test 4 passed.', '**STALE:** rev abc123: `npm test` 4 passed.', 'STALE - rev abc123 npm test 4 passed.', 'FAILED: rev abc123 npm test 3/4.']
   .map((value): [string, string, string] => [`marked evidence "${value}"`, evidence(value), 'marked stale or failed']),
  ['unparseable item line', complete.replace('- [x] C-001 [build] First outcome.', '- [x] C-1 build First outcome.'), 'cannot parse'],
  ['unknown stage', complete.replace('C-001 [build]', 'C-001 [deploy]'), 'cannot parse'],
  ['item without a checkbox', complete.replace('- [x] C-001 [build]', '- C-001 [build]'), 'list entry without a checkbox'],
  ['ordered-list item', complete.replace('- [x] C-001 [build]', '1. [x] C-001 [build]'), 'cannot parse'],
  ['indented checkbox entry', complete.replace('- [x] C-002 [release]', '  - [x] C-002 [release]'), 'must start at the beginning of the line'],
  ['item after an unknown heading', hide('## Release items\n\n'), 'looks like a checklist entry but is not one'],
  ['item in a blockquote', hide('> ').replace(/\n  - (Source|Accept|Verify|Evidence): /g, '\n>   - $1: '), 'cannot parse'],
  ['item with a minus-sign bullet', hide('− '.slice(0, 2)).replace('− - [ ]', '− [ ]'), 'cannot parse'],
  ['item without a bullet', hide('').replace('\n- [ ] C-003', '\n[ ] C-003'), 'cannot parse'],
  ['item without a space after the bullet', hide('').replace('\n- [ ] C-003', '\n-[ ] C-003'), 'cannot parse'],
  ['item in a table row', complete.replace('\n## Decisions', '\n| C-003 | [build] | Data is preserved |\n\n## Decisions'), 'items cannot be table rows'],
  ['checkbox entry outside Items', complete.replace('- 2026-10-09 rev abc123: npm test passed.', '- [ ] C-050 [release] mentioned in verification\n- 2026-10-09 rev abc123: npm test passed.'), 'looks like a checklist entry but is not one'],
  ['field outside an item', complete.replace('\n## Decisions', '\nA paragraph.\n\n  - Status: BLOCKED\n\n## Decisions'), 'field outside an item'],
  ['unknown dependency', withC2(C2.replace('Depends on: C-001.', 'Depends on: C-009.')), 'depends on unknown item C-009'],
  ['self dependency', withC2(C2.replace('Depends on: C-001.', 'Depends on: C-002.')), 'depends on itself'],
  ['dependency without IDs', withC2(C2.replace('Depends on: C-001.', 'Depends on: the first one.')), 'Depends on must list item IDs or None'],
  ['checked item depending on an open item', complete.replace('- [x] C-001', '- [ ] C-001'), 'checked but depends on open C-001'],
  ['exception status on a checked item', withC2(C2 + '\n  - Status: BLOCKED\n  - Reason: Specific reason.\n  - Authority: Policy.'), 'keeps its box unchecked'],
  ['unknown status', exception('DEFERRED'), 'Status must be BLOCKED, WAIVED or NOT APPLICABLE'],
  ['an inherited property name as status', logged(exception('constructor'), '- C-002 n/a.'), 'Status must be BLOCKED, WAIVED or NOT APPLICABLE'],
  ['waiver without authority', logged(exception('WAIVED', {authority: null}), '- Waived C-002.'), 'WAIVED needs the Authority'],
  ['waiver whose authority denies one exists', logged(exception('WAIVED', {authority: 'None given; agent decision.'}), '- Waived C-002.'), 'WAIVED needs the Authority'],
  ['waiver without a reason', logged(exception('WAIVED', {reason: null}), '- Waived C-002.'), 'WAIVED needs a Reason'],
  ['waiver missing from the Change Log', exception('WAIVED'), 'WAIVED must be recorded in a Change Log entry naming C-002'],
  ['waiver logged only in an HTML comment', logged(exception('WAIVED'), '<!-- Waived C-002 -->'), 'WAIVED must be recorded in a Change Log entry naming C-002'],
  ['not-applicable without authority', logged(exception('NOT APPLICABLE', {authority: null}), '- C-002 not applicable.'), 'NOT APPLICABLE needs the Authority'],
  ['not-applicable missing from the Change Log', logged(exception('NOT APPLICABLE'), '- Reviewed C-002 wording.'), 'NOT APPLICABLE must be recorded in a Change Log entry naming C-002'],
  ['blocked without authority', exception('BLOCKED', {authority: null}), 'BLOCKED needs the Authority'],
  ['blocked without exception evidence', exception('BLOCKED').replace('Registry approval requested in issue #51 on 2026-10-09.', 'Pending.'), 'BLOCKED needs Evidence'],
  ['every item not applicable', logged(logged(exception('NOT APPLICABLE'), '- C-002 not applicable.').replace('- [x] C-001 [build] First outcome.', '- [ ] C-001 [build] First outcome.').replace('  - Depends on: None.', '  - Depends on: None.\n  - Status: NOT APPLICABLE\n  - Reason: Out of scope.\n  - Authority: Brief section 2.'), '- C-001 not applicable.'), 'every item is NOT APPLICABLE'],
  ['missing section', complete.replace('## Resume\n\n- State: complete.\n', ''), 'missing section "## Resume"'],
  ['empty Request', complete.replace('- Objective: fixture request.\n', ''), 'section "## Request" is empty'],
  ['duplicate section', complete + '\n## Decisions\n\n- Again.\n', 'duplicate section "## Decisions"'],
  ['no items', complete.replace(/### Group\n\n[\s\S]*?\n\n## Decisions/, '### Group\n\nNothing yet.\n\n## Decisions'), 'no checklist items found'],
  ['unknown field', complete.replace('  - Depends on: None.', '  - Notes: extra.\n  - Depends on: None.'), 'expected "- Field: value"'],
  ['duplicate field', complete.replace('  - Depends on: None.', '  - Depends on: None.\n  - Depends on: None.'), 'C-001: duplicate Depends on'],
  ['duplicate close-out field', closeOut(PASSED + '\n- Review: pending'), 'duplicate Review'],
  ['self review without disclosure', closeOut('- Review: self.\n- Inventory: inventory.md\n- Result: PASS.'), 'self review must say it was not independent'],
  ['resolved finding without a resolution', closeOut(PASSED + '\n\n- [x] F-001 Something was found.'), 'F-001: resolved finding needs a Resolution'],
  ['duplicate finding ID', closeOut(PASSED + '\n\n- [ ] F-001 One.\n- [ ] F-001 Two.'), 'duplicate finding ID F-001'],
  ['unparseable finding', closeOut(PASSED + '\n\n- [ ] Missing an ID.'), 'cannot parse'],
  ['finding without a checkbox', closeOut(PASSED + '\n\n- F-001 Data loss on retry; unresolved.'), 'must be a checkbox entry'],
 ];
 it.each(invalid)('rejects %s', (_name, text, message) => {
  const result = run(text);
  expect(result.status).toBe(1);
  expect(result.stdout).toMatch(/^CHECKLIST INVALID \| errors=\d+ \| file=checklist\.md$/m);
  expect(result.stderr).toContain(message);
 });
 it('ignores fenced examples and descriptive [release] text outside item lines', () => {
  const text = complete.replace('### Group\n', '### Group\n\nItems tagged [release] need the published result; see C-099 [release] below.\n\n```text\n- [ ] C-099 [release] Example only.\n## Items\n```\n')
   .replace('- 2026-10-09 rev abc123: npm test passed.', '- C-050 [release] is mentioned in verification prose.\n- 2026-10-09 rev abc123: npm test passed.');
  const result = run(text); expect(result.status, result.stderr).toBe(0);
  expect(result.stdout).toContain('verified=2/2 | open=none');
 });
 it('stays fast on very long lines', () => {
  const started = Date.now();
  const result = run(complete.replace('### Group\n', `### Group\n\n- a${' '.repeat(200000)}x\n## Notes${' '.repeat(200000)}x\n`));
  expect(result.status).toBe(1); expect(Date.now() - started).toBeLessThan(5000);
 });
});

describe('portable Checklist validator: ratchet and usage', () => {
 it('accepts an unchanged baseline and a correction recorded in a new Change Log entry', () => {
  expect(run(complete, ['--baseline', 'baseline.md'], complete).status).toBe(0);
  const corrected = logged(complete.replace('Accept: Published condition holds.', 'Accept: Published condition holds on the release page.'), '- 2026-10-09T12:00Z Corrected C-002 Accept from "Published condition holds." (ambiguous) per user.');
  const result = run(corrected, ['--baseline', 'baseline.md'], complete); expect(result.status, result.stderr).toBe(0);
 });
 const removed = withC2('').replace(/\n\n\n/, '\n\n');
 it.each([
  ['a removed item', removed, 'C-002 was removed without a new Change Log entry'],
  ['weakened acceptance', complete.replace('Accept: Published condition holds.', 'Accept: Something happened.'), 'C-002: Accept changed'],
  ['weakened acceptance with an unrelated new entry', logged(complete.replace('Accept: Published condition holds.', 'Accept: Something happened.'), '- 2026-10-09T12:00Z Verified C-002 on the release page.'), 'C-002: Accept changed'],
  ['a changed verification', complete.replace('Verify: Run the first check.', 'Verify: Read the code.'), 'C-001: Verify changed'],
  ['a changed outcome', complete.replace('First outcome.', 'Smaller outcome.'), 'C-001: outcome changed'],
  ['a changed stage', complete.replace('C-002 [release]', 'C-002 [build]'), 'C-002: stage changed'],
  ['an edited Change Log entry', complete.replace('Created C-001 and C-002.', 'Created C-001.'), 'Change Log is append-only'],
  ['a backdated Change Log entry', complete.replace('- 2026-10-09T09:00Z Created C-001 and C-002.', '- 2026-10-09T08:00Z Corrected C-002 early.\n- 2026-10-09T09:00Z Created C-001 and C-002.'), 'Change Log is append-only'],
 ])('rejects %s without a new Change Log entry recording the correction', (_name, text, message) => {
  const result = run(text, ['--baseline', 'baseline.md'], complete);
  expect(result.status).toBe(1); expect(result.stderr).toContain(message);
 });
 it('rejects deleting an open finding without a recorded correction', () => {
  const baseline = closeOut('- Review: pending\n- Inventory: pending\n- Result: pending\n\n- [ ] F-001 Retried export loses the last record.');
  const result = run(closeOut(PASSED), ['--baseline', 'baseline.md'], baseline);
  expect(result.status).toBe(1); expect(result.stderr).toContain('F-001 was removed without a new Change Log entry');
 });
 it('accepts a logged removal and keeps the removed ID retired', () => {
  const removal = logged(removed, '- 2026-10-09T12:00Z Removed C-002: duplicate of C-001 (original text: "Published outcome"), approved by user.');
  const result = run(removal, ['--baseline', 'baseline.md'], complete); expect(result.status, result.stderr).toBe(0);
  expect(result.stdout).toContain('verified=1/1');
  const reused = run(logged(complete, '- 2026-10-09T12:00Z Removed C-002: duplicate of C-001 (original text: "Published outcome"), approved by user.'), ['--baseline', 'baseline.md'], removal);
  expect(reused.status).toBe(1); expect(reused.stderr).toContain('C-002 was removed earlier; IDs are never reused');
 });
 it('rejects a baseline without items', () => {
  const result = run(complete, ['--baseline', 'baseline.md'], '# Empty\n');
  expect(result.status).toBe(1); expect(result.stderr).toContain('has no parseable items');
 });
 it.each([
  [[], 'usage: validate-checklist.mjs'],
  [['--baseline'], 'unexpected argument: --baseline'],
  [['--strict'], 'unexpected argument: --strict'],
  [['other.md'], 'unexpected argument: other.md'],
 ])('rejects bad arguments %j with usage', (args, message) => {
  const cwd = mkdtempSync(join(tmpdir(), 'checklist-validator-')); temporary.push(cwd);
  writeFileSync(join(cwd, 'checklist.md'), complete);
  const result = spawnSync(process.execPath, [validator, ...(args.length ? ['checklist.md', ...args] : [])], {cwd, encoding: 'utf8'});
  expect(result.status).toBe(1); expect(result.stderr).toContain(message);
 });
 it('reports unreadable files and prints help', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'checklist-validator-')); temporary.push(cwd);
  const missing = spawnSync(process.execPath, [validator, 'missing.md'], {cwd, encoding: 'utf8'});
  expect(missing.status).toBe(1); expect(missing.stderr).toContain('cannot read missing.md');
  const baseline = run(complete, ['--baseline', 'absent.md']);
  expect(baseline.status).toBe(1); expect(baseline.stderr).toContain('cannot read absent.md');
  const help = spawnSync(process.execPath, [validator, '--help'], {cwd, encoding: 'utf8'});
  expect(help.status).toBe(0); expect(help.stdout).toContain('usage: validate-checklist.mjs');
 });
});

describe('Checklist format reference', () => {
 // The documented template and example must stay valid for the shipped validator.
 const blocks = [...readFileSync(resolve('skills/checklist/references/checklist-format.md'), 'utf8').matchAll(/^```markdown\n([\s\S]*?)^```$/gm)].map(match => match[1]!);
 it('has a template that validates as open and an example that validates as complete', () => {
  expect(blocks).toHaveLength(2);
  const template = run(blocks[0]!); expect(template.status, template.stderr).toBe(2);
  expect(template.stdout).toContain('CHECKLIST OPEN | verified=0/1 | open=C-001');
  const example = run(blocks[1]!); expect(example.status, example.stderr).toBe(0);
  expect(example.stdout).toContain('CHECKLIST VERIFIED COMPLETE | verified=4/4');
 });
});
