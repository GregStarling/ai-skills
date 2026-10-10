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
const exception = (status: string, {reason = 'Specific reason for the exception.' as string | null, authority = 'Registry policy: owner approval required (issue #51).' as string | null} = {}) => withC2(`- [ ] C-002 [release] Published outcome.
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
 it('rejects HTML comments, which could hide fields or items, but not comment markers in code spans', () => {
  const hidden = run(closeOut('- Review: pending\n- Inventory: pending\n- Result: pending\n\n<!--\n- Review: independent — x.\n- Inventory: y.md\n- Result: PASS.\n-->'));
  expect(hidden.status).toBe(1); expect(hidden.stderr).toContain('HTML comments are not allowed');
  expect(run(complete.replace('- None material.', '- Comments such as `<!--` are not used.')).status).toBe(0);
 });
 it('keeps the record open while a close-out finding is unresolved, and accepts resolved findings', () => {
  const base = '- Review: self (not independent) — fresh inventory first.\n- Inventory: inventory.md\n- Result: PASS after fixes.\n\n';
  const open = run(closeOut(base + '- [ ] F-001 Read-only directory reports success.'));
  expect(open.status).toBe(2); expect(open.stdout).toContain('findings_open=F-001');
  const resolved = run(closeOut(base + '- [x] F-001 Read-only directory reports success.\n  - Resolution: Added C-003; fixed at rev def456.'));
  expect(resolved.status, resolved.stderr).toBe(0); expect(resolved.stdout).toContain('review=self');
 });
 it('counts items that render despite unusual fences, and rejects invisible characters', () => {
  const extra = '- [ ] C-003 [build] Data is preserved on retry.\n  - Source: Pre-mortem P1.\n  - Accept: Retry keeps data.\n  - Verify: Retry test.\n  - Evidence: Pending.';
  const item = (prefix: string, suffix = '') => complete.replace('\n## Decisions', `${prefix}${extra}${suffix}\n\n## Decisions`);
  const inline = run(item('\n```note``` items below are tracked here\n\n', '\n\n```end``` of tracked items'));
  expect(inline.status, inline.stderr).toBe(2); expect(inline.stdout).toContain('open=C-003');
  const inItem = run(complete.replace('  - Depends on: None.', '  - Depends on: None.\n  ```\n  output').replace('\n## Decisions', `${extra}\n\n## Decisions`));
  expect(inItem.status).toBe(1); expect(inItem.stderr).toContain('code fences must start at column 0');
  const invisible = run(item(`\n${String.fromCharCode(0x200b)}`));
  expect(invisible.status).toBe(1); expect(invisible.stderr).toContain('invisible formatting characters are not allowed');
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
   .map((value): [string, string, string] => [`evidence "${value}" on a checked item`, evidence(value), 'checked item']),
  ...['STALE: rev abc123 npm test 4 passed.', '**STALE:** rev abc123: `npm test` 4 passed.', 'STALE - rev abc123 npm test 4 passed.', 'FAILED: rev abc123 npm test 3/4.']
   .map((value): [string, string, string] => [`marked evidence "${value}"`, evidence(value), 'marked stale or failed']),
  ['unparseable item line', complete.replace('- [x] C-001 [build] First outcome.', '- [x] C-1 build First outcome.'), 'cannot parse'],
  ['unknown stage', complete.replace('C-001 [build]', 'C-001 [deploy]'), 'cannot parse'],
  ['item without a checkbox', complete.replace('- [x] C-001 [build]', '- C-001 [build]'), 'list entry without a checkbox'],
  ['ordered-list item', complete.replace('- [x] C-001 [build]', '1. [x] C-001 [build]'), 'cannot parse'],
  ['indented checkbox entry', complete.replace('- [x] C-002 [release]', '  - [x] C-002 [release]'), 'must start at the beginning of the line'],
  ['item after an unknown heading', hide('## Release items\n\n'), 'task checkboxes belong only under'],
  ['item in a blockquote', hide('> ').replace(/\n  - (Source|Accept|Verify|Evidence): /g, '\n>   - $1: '), 'cannot parse'],
  ['item with a minus-sign bullet', hide('− '.slice(0, 2)).replace('− - [ ]', '− [ ]'), 'cannot parse'],
  ['item without a bullet', hide('').replace('\n- [ ] C-003', '\n[ ] C-003'), 'cannot parse'],
  ['item without a space after the bullet', hide('').replace('\n- [ ] C-003', '\n-[ ] C-003'), 'cannot parse'],
  ['item in a table row', complete.replace('\n## Decisions', '\n| C-003 | [build] | Data is preserved |\n\n## Decisions'), 'items cannot be table rows'],
  ['checkbox entry outside Items', complete.replace('- 2026-10-09 rev abc123: npm test passed.', '- [ ] C-050 [release] mentioned in verification\n- 2026-10-09 rev abc123: npm test passed.'), 'task checkboxes belong only under'],
  ['checkbox-like entry without a bullet outside Items', complete.replace('- State: complete.', '- State: complete.\n\n[ ] C-050 later.'), 'looks like a checklist entry but is not one'],
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
  ['waiver logged only in an HTML comment', logged(exception('WAIVED'), '<!-- Waived C-002 -->'), 'HTML comments are not allowed'],
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

describe('portable Checklist validator: second adversarial round', () => {
 const extra = '- [ ] C-003 [build] Data is preserved on retry.\n  - Source: Pre-mortem P1.\n  - Accept: Retry keeps data.\n  - Verify: Retry test.\n  - Evidence: Pending.';
 const before = (text: string) => complete.replace('\n## Decisions', `${text}\n\n## Decisions`);
 it.each([
  ['an empty HTML comment', before(`\n<!-->\n${extra}`), 'HTML comments are not allowed'],
  ['a raw HTML block', before(`\n<div>\n\n${extra}\n\n</div>`), 'is not allowed because it does not render'],
  ['an unclosed fence', before('\n```text\nunfinished example'), 'code fence is never closed'],
  ...['**C-003**', 'C\\-003', 'C‑003', '[C-003](#c-003)'].map((id): [string, string, string] =>
   [`a disguised ID ${id} outside Items`, complete.replace('- State: complete.', `- State: complete.\n- [ ] ${id} [build] Data is preserved.`), 'task checkboxes belong only under']),
  ...['Not tested at rev abc123.', 'TODO: run `npm test`.', 'Pending (rerun at rev abc124).']
   .map((value): [string, string, string] => [`evidence "${value}"`, evidence(value), 'starts by saying the check has not happened']),
  ...['Verified on 2026-10-09.', 'Checked by me at 10:00.']
   .map((value): [string, string, string] => [`evidence "${value}"`, evidence(value), 'checked item needs evidence']),
  ...['**STALE**: rev abc123: `npm test` 4 passed.', 'FAILED (rerun at rev abc124): `npm test` 3/4.', '[STALE] rev abc123: `npm test` 4 passed.', 'Stale. Was: rev abc123 `npm test` 4 passed.']
   .map((value): [string, string, string] => [`marked evidence "${value}"`, evidence(value), 'marked stale or failed']),
  ['a struck independent claim on a self review', closeOut('- Review: ~~independent~~ self, by the same agent.\n- Inventory: inventory.md\n- Result: PASS.'), 'self review must say it was not independent'],
  ['an authority that disclaims itself in parentheses', logged(exception('WAIVED', {authority: '(none given; agent decision)'}), '- Waived C-002.'), 'WAIVED needs the Authority'],
  ['every required item waived', logged(logged(exception('WAIVED', {authority: 'User message 2026-10-09.'}), '- Waived C-002 per user.').replace('- [x] C-001 [build] First outcome.', '- [ ] C-001 [build] First outcome.').replace('  - Depends on: None.', '  - Depends on: None.\n  - Status: WAIVED\n  - Reason: User removed it.\n  - Authority: User message 2026-10-09.'), '- Waived C-001 per user.'), 'nothing was verified'],
  ['a future event time', logged(complete, '- 2099-01-01T00:00Z Verified C-002.'), 'is in the future'],
  ['a 1-space indented top-level fence around a review', closeOut('- Review: pending\n- Inventory: pending\n- Result: pending\n\n ```text\n- Review: independent — x.\n- Inventory: y.md\n- Result: PASS.\n ```'), 'code fences must start at column 0'],
 ])('rejects %s', (_name, text, message) => {
  const result = run(text); expect(result.status).toBe(1); expect(result.stderr).toContain(message);
 });
 it.each([
  ['a 4-space indented closing fence', before(`\n\`\`\`markdown\nexample\n    \`\`\`\n\`\`\`\n\n${extra}`), 'open=C-003'],
  ['a struck PASS', closeOut('- Review: independent — fresh reviewer.\n- Inventory: inventory.md\n- Result: ~~PASS~~ FAIL — regression in C-001.'), 'review=pending'],
  ['a PASS/FAIL template', closeOut('- Review: independent — fresh reviewer.\n- Inventory: inventory.md\n- Result: PASS/FAIL'), 'review=pending'],
  ['a review still to be assigned', closeOut('- Review: independent — to be assigned.\n- Inventory: inventory.md\n- Result: PASS.'), 'review=pending'],
 ])('keeps the record open for %s', (_name, text, expected) => {
  const result = run(text); expect(result.status, result.stderr).toBe(2); expect(result.stdout).toContain(expected);
 });
 it.each([
  ['a link sub-bullet in evidence', complete.replace('`npm test` 4 passed.', '`npm test` 4 passed.\n    - [test log](logs/test.txt)')],
  ['item syntax quoted in a code span', complete.replace('Accept: First condition holds.', 'Accept: The parser accepts `- [ ] C-001 [build] Outcome` lines.')],
  ['evidence that begins by describing the earlier failure', evidence('Failed before the fix; `npm test` now 4/4 at rev abc123.')],
  ['a Result of Passed', closeOut('- Review: independent — fresh reviewer.\n- Inventory: inventory.md\n- Result: Passed; no open material findings.')],
  ['an emphasized self-review disclosure', closeOut('- Review: self — **not** independent; fresh inventory first.\n- Inventory: inventory.md\n- Result: PASS.')],
  ['a future deadline after the event time', logged(complete, '- 2026-10-09T10:00Z Noted that the routing pack expires 2099-01-01T00:00Z.')],
 ])('accepts %s', (_name, text) => {
  const result = run(text); expect(result.status, result.stderr).toBe(0);
 });
 it('rejects reopen or no-change entries as authority to weaken or remove an item, but keeps planned IDs reusable', () => {
  for (const [text, message] of [
   [logged(complete.replace('Accept: Published condition holds.', 'Accept: Something happened.'), '- 2026-10-09T12:00Z Reopened C-002: shared helper changed.'), 'C-002: Accept changed'],
   [logged(complete.replace('Verify: Run the first check.', 'Verify: Read the code.'), '- 2026-10-09T12:00Z No changes to C-001 behavior.'), 'C-001: Verify changed'],
  ] as const) {
   const result = run(text, ['--baseline', 'baseline.md'], complete); expect(result.status).toBe(1); expect(result.stderr).toContain(message);
  }
  const planned = logged(complete, '- 2026-10-09T10:00Z C-003 will be added once the API spec lands.');
  const added = run(before(`\n${extra}`).replace('- 2026-10-09T09:00Z Created C-001 and C-002.', '- 2026-10-09T09:00Z Created C-001 and C-002.\n- 2026-10-09T10:00Z C-003 will be added once the API spec lands.\n- 2026-10-09T11:00Z Added C-003 from the API spec.'), ['--baseline', 'baseline.md'], planned);
  expect(added.status, added.stderr).toBe(2); expect(added.stdout).toContain('open=C-003');
 });
});

describe('portable Checklist validator: third adversarial round', () => {
 const extra = '- [ ] C-003 [build] Data is preserved on retry.\n  - Source: Pre-mortem P1.\n  - Accept: Retry keeps data.\n  - Verify: Retry test.\n  - Evidence: Pending.';
 const before = (text: string) => complete.replace('\n## Decisions', `${text}\n\n## Decisions`);
 const resume = (line: string) => complete.replace('- State: complete.', `- State: complete.\n${line}`);
 it.each([
  ['an invisible character before a fence', before(`\n${String.fromCharCode(0x200b)}\`\`\`\n${extra}\n${String.fromCharCode(0x200b)}\`\`\``), 'invisible formatting characters are not allowed'],
  ['a processing-instruction block', closeOut('<?\n- Review: independent — x.\n- Inventory: y.md\n- Result: PASS.\n?>\nThe close-out has not started.'), 'is not allowed because it does not render'],
  ['inline raw HTML in evidence', evidence('<?rev abc123: `npm test` 4 passed?>Pending.'), 'is not allowed because it does not render'],
  ['a character reference in an ID', resume('- [ ] C&#45;003 [build] Retried export keeps every record.'), 'character references are not allowed'],
  ['a misindented exception on a checked item', withC2(C2 + '\n   - Status: BLOCKED\n   - Reason: Specific reason.\n   - Authority: Policy.'), 'inconsistent indentation'],
  ['a 2-space top-level fence after a paragraph', closeOut('The close-out review has not started. Expected shape:\n\n  ```text\n  - Review: independent — x.\n  ```\n\n- Review: pending\n- Inventory: pending\n- Result: pending'), 'code fences must start at column 0'],
  ['an unchecked task in Resume that names an ID later', resume('- [ ] Re-run the retry test for C-003 after the rebase.'), 'task checkboxes belong only under'],
  ['a Cyrillic look-alike ID outside Items', resume(`- [ ] ${String.fromCharCode(0x0421)}-003 [build] Retried export keeps every record.`), 'task checkboxes belong only under'],
  ['angle-bracket template placeholders', complete.replace('### Group', '### <Group>'), 'is not allowed because it does not render'],
  ...['Checked at 23:04:20Z.', 'Verified Fri Oct  9 23:07:55 UTC 2026.', 'Verified on 9 October 2026.', 'Checked by me at 10:00am.', 'Verified on Friday the 9th.', 'Verified at 10am.']
   .map((value): [string, string, string] => [`evidence "${value}"`, evidence(value), 'checked item needs evidence']),
  ...['To do: run `npm test`.', 'Not yet: `npm test` is queued.', 'Will run `npm test` after the merge.', 'Awaiting: CI run 42.', 'Unable to run `npm test` here.']
   .map((value): [string, string, string] => [`evidence "${value}"`, evidence(value), 'starts by saying the check has not happened']),
  ['an authority of Nil', logged(exception('WAIVED', {authority: 'Nil; the agent decided.'}), '- Waived C-002.'), 'WAIVED needs the Authority'],
  ...['2026-10-09 STALE: rev abc123 `npm test` 4 passed.', 'Stale rev abc123 `npm test` 4 passed.', 'OUTDATED: rev abc123 `npm test` 4 passed.', 'FAILING: rev abc124 `npm test` 3/4 passed.']
   .map((value): [string, string, string] => [`marked evidence "${value}"`, evidence(value), 'marked stale or failed']),
 ])('rejects %s', (_name, text, message) => {
  const result = run(text); expect(result.status).toBe(1); expect(result.stderr).toContain(message);
 });
 it.each([
  ['a single-tilde struck PASS', closeOut('- Review: independent — fresh reviewer.\n- Inventory: inventory.md\n- Result: ~PASS~ FAIL — rerun found a regression.')],
  ['a review not yet assigned', closeOut('- Review: independent — not yet assigned.\n- Inventory: not yet recorded; will go in review.md\n- Result: PASS expected.')],
  ['a PASS | FAIL template', closeOut('- Review: independent — fresh reviewer.\n- Inventory: inventory.md\n- Result: PASS | FAIL')],
  ['a PASS, FAIL or BLOCKED template', closeOut('- Review: independent — fresh reviewer.\n- Inventory: inventory.md\n- Result: PASS, FAIL or BLOCKED')],
 ])('keeps the record open for %s', (_name, text) => {
  const result = run(text); expect(result.status, result.stderr).toBe(2); expect(result.stdout).toContain('review=pending');
 });
 it.each([
  ['an ASCII arrow in the Change Log', logged(complete, '- 2026-10-09T10:00Z Clarified wording: parse --> validate.')],
  ['evidence about skipped rows', evidence('Skipped rows are now logged: `npm test` 5 passed at rev abc123.')],
  ['evidence that verifies a future expiry', evidence('rev abc123: `openssl x509 -enddate -noout -in cert.pem` shows expiry 2099-01-15T00:00Z.')],
  ['an autolink in evidence', evidence('rev abc123 build log at <https://ci.example.com/run/42>.')],
 ])('accepts %s', (_name, text) => {
  const result = run(text); expect(result.status, result.stderr).toBe(0);
 });
 it('keeps a record with a user waiver open while other work is open', () => {
  const waived = logged(exception('WAIVED', {authority: 'User message 2026-10-09.'}), '- Waived C-002 per user.').replace('- [x] C-001 [build] First outcome.', '- [ ] C-001 [build] First outcome.');
  const result = run(waived); expect(result.status, result.stderr).toBe(2); expect(result.stdout).toContain('CHECKLIST OPEN | verified=0/2 | open=C-001 | blocked=none | waived=C-002');
 });
 it('rejects negated correction entries and retires IDs dropped by a correction, but not planned ones', () => {
  for (const entry of ['Verified C-002 again; Accept not changed.', 'Corrected a typo in C-001; C-002 verified on the release page.']) {
   const result = run(logged(complete.replace('Accept: Published condition holds.', 'Accept: Something happened.'), `- 2026-10-09T12:00Z ${entry}`), ['--baseline', 'baseline.md'], complete);
   expect(result.status).toBe(1); expect(result.stderr).toContain('C-002: Accept changed');
  }
  const dropped = logged(withC2('').replace(/\n\n\n/, '\n\n'), '- 2026-10-09T12:00Z Corrected C-002: inapplicable to this CLI, dropped.');
  const reused = run(logged(complete, '- 2026-10-09T12:00Z Corrected C-002: inapplicable to this CLI, dropped.'), ['--baseline', 'baseline.md'], dropped);
  expect(reused.status).toBe(1); expect(reused.stderr).toContain('C-002 was removed earlier');
  const planned = logged(complete, '- 2026-10-09T10:00Z C-003 (bulk delete) will be added once the API spec lands.');
  const added = run(before(`\n${extra}`).replace('- 2026-10-09T09:00Z Created C-001 and C-002.', '- 2026-10-09T09:00Z Created C-001 and C-002.\n- 2026-10-09T10:00Z C-003 (bulk delete) will be added once the API spec lands.'), ['--baseline', 'baseline.md'], planned);
  expect(added.status, added.stderr).toBe(2); expect(added.stdout).toContain('open=C-003');
 });
 it('stays fast on bracket-heavy lines', () => {
  const started = Date.now();
  const result = run(resume(`- ${'[a'.repeat(100000)}`));
  expect(result.status).toBe(0); expect(Date.now() - started).toBeLessThan(5000);
 });
});

describe('portable Checklist validator: fourth review round', () => {
 const tail = '  - Depends on: C-001.';
 it('does not let a column-0 fence close an in-item fence and hide the next entry', () => {
  const hidden = complete.replace(tail, `${tail}\n  \`\`\`\n  output\n\`\`\`\n  \`\`\`\n  - [ ] C-003 [build] Hidden open item.`);
  const result = run(hidden); expect(result.status).not.toBe(0); expect(result.stdout + result.stderr).toMatch(/C-003|INVALID/);
  const finding = closeOut(`${PASSED}\n\n- [x] F-001 Fixed thing.\n  - Resolution: Added C-003.\n  \`\`\`\n  output\n\`\`\`\n  \`\`\`\n  - [ ] F-002 Open material finding.`);
  const findingResult = run(finding); expect(findingResult.status).not.toBe(0);
 });
 it.each([
  ['an unable-to-reproduce regression check led by the check', '`./repro.sh` 50/50 runs clean after the fix at rev abc123; unable to reproduce.'],
  ['queued messages led by the check', '`npm run test:queue` 12 passed at rev abc123: queued messages survive a restart.'],
  ['a waiting spinner led by the check', 'Screenshot shots/waiting.png at rev abc123: the waiting spinner renders.'],
  ['planned maintenance', 'Planned-maintenance banner shows: `npm test -- banner` 3 passed.'],
  ['awaiting-approval orders', 'Awaiting-approval orders listed: `curl /orders?state=awaiting` returned 4.'],
  ['will-call orders', 'Will-call orders print: `npm test -- willcall` 2 passed.'],
  ['words that start like month names', 'Decoded 12 sample frames and every hash matched the fixture.'],
  ['a count that looks like a year', 'Load test served 2000 requests: `k6 run load.js` p95 120 ms.'],
 ])('accepts evidence about %s', (_name, value) => {
  const result = run(evidence(value)); expect(result.status, result.stderr).toBe(0);
 });
 it.each([
  ['a negated pending', 'PASS; no findings pending.'],
  ['nothing awaiting', 'PASS. Nothing is awaiting action.'],
 ])('counts a passing review with %s', (_name, result) => {
  const out = run(closeOut(`- Review: independent — fresh reviewer.\n- Inventory: inventory.md\n- Result: ${result}`));
  expect(out.status, out.stderr).toBe(0);
 });
 it.each(['PASS if the rerun holds.', 'PASS?', 'PASS except one check.'])('keeps a qualified result %j open with a note', (result) => {
  const out = run(closeOut(`- Review: independent — fresh reviewer.\n- Inventory: inventory.md\n- Result: ${result}`));
  expect(out.status).toBe(2); expect(out.stdout).toContain('review=pending'); expect(out.stderr).toContain('note:');
 });
 it('explains a review that says it is not finished', () => {
  const out = run(closeOut('- Review: independent — fresh reviewer.\n- Inventory: to be written in review.md\n- Result: PASS.'));
  expect(out.status).toBe(2); expect(out.stderr).toContain('not finished');
 });
 it('checks numbered log entries for future event times', () => {
  const out = run(complete.replace('- 2026-10-09T09:00Z Created C-001 and C-002.', '1. 2026-10-09T09:00Z Created C-001 and C-002.\n2. 2099-01-01T00:00Z Verified C-002.'));
  expect(out.status).toBe(1); expect(out.stderr).toContain('is in the future');
 });
 it('rejects a correction word that belongs to another comma clause', () => {
  const out = run(logged(complete.replace('Accept: Published condition holds.', 'Accept: Something happened.'), '- 2026-10-09T12:00Z Corrected a typo in C-001, C-002 verified.'), ['--baseline', 'baseline.md'], complete);
  expect(out.status).toBe(1); expect(out.stderr).toContain('C-002: Accept changed');
 });
 it('reports a record with a waiver and only blocked work left as blocked, not invalid', () => {
  const text = logged(exception('WAIVED', {authority: 'User message 2026-10-09.'}), '- Waived C-002 per user.').replace('- [x] C-001 [build] First outcome.', '- [ ] C-001 [build] First outcome.')
   .replace('  - Depends on: None.', '  - Depends on: None.\n  - Status: BLOCKED\n  - Reason: Needs a registry token.\n  - Authority: Registry policy.');
  const out = run(text); expect(out.status, out.stderr).toBe(2); expect(out.stdout).toContain('CHECKLIST BLOCKED | verified=0/2');
 });
 it('names the offending tag in the raw HTML message', () => {
  const out = run(evidence('rev abc123 printed "usage: notes.js delete <id>" as expected, `npm test` 4 passed.'));
  expect(out.status).toBe(1); expect(out.stderr).toContain('raw HTML <id>');
 });
});

describe('portable Checklist validator: fifth review round', () => {
 const tail = '  - Depends on: C-001.';
 it.each([
  ['a fence opened at 3 spaces in an item', complete.replace(tail, `${tail}\n   \`\`\`\n   output\n  \`\`\`\n- [ ] C-003 [build] Hidden.`)],
  ['a wide-marker item with a 4-space fence', complete.replace(tail, `${tail}\n    \`\`\`\n    output\n  \`\`\`\n\`\`\`\n- [ ] C-003 [build] Hidden.`)],
  ['a 2-space fence after a top-level fence', complete.replace(tail, `${tail}\n\`\`\`text\nexample\n\`\`\`\n  \`\`\`\n\`\`\`\n- [ ] C-003 [build] Hidden.`)],
 ])('rejects %s', (_name, text) => {
  const result = run(text); expect(result.status).toBe(1); expect(result.stderr).toMatch(/code fence/);
 });
 it.each([
  'PASS pending re-run with no code changes.',
  'PASS pending final sign-off (no blockers).',
  'PASS; final review planned.',
  'PASS provided the rerun holds.',
  'PASS for now.',
  'PASS, tentatively.',
 ])('keeps %j pending', (result) => {
  const out = run(closeOut(`- Review: independent — fresh reviewer.\n- Inventory: inventory.md\n- Result: ${result}`));
  expect(out.status).toBe(2); expect(out.stdout).toContain('review=pending'); expect(out.stderr).toContain('note:');
 });
 it.each([
  ['a review that will run with no prior context', '- Review: independent — will be run by a fresh reviewer with no prior context.\n- Inventory: inventory.md\n- Result: PASS.'],
  ['an inventory not yet recorded', '- Review: independent — fresh reviewer.\n- Inventory: not yet recorded (no time).\n- Result: PASS.'],
 ])('keeps %s pending', (_name, lines) => {
  const out = run(closeOut(lines)); expect(out.status).toBe(2); expect(out.stdout).toContain('review=pending');
 });
 it.each(['Will be executed in CI run 4412.', 'Awaiting CI run 4412.', 'Queued CI run 4412.', 'Planned run of `npm test` after merge.', 'Unable to access staging; `npm test` not run.'])(
  'rejects evidence %j', (value) => {
   const result = run(evidence(value)); expect(result.status).toBe(1); expect(result.stderr).toContain('starts by saying the check has not happened');
  });
 it('sets aside a year that ends a phrase but keeps counts', () => {
  const year = run(evidence('All tests passed in 2026.')); expect(year.status).toBe(1); expect(year.stderr).toContain('checked item needs evidence');
  expect(run(evidence('Load test served 2048-byte payloads: `k6 run load.js` passed.')).status).toBe(0);
 });
 it('explains why a recorded review does not count', () => {
  const out = run(closeOut('- Review: fresh reviewer.\n- Inventory: none\n- Result: PASS.'));
  expect(out.status).toBe(2); expect(out.stderr).toContain('must start with "independent" or "self"'); expect(out.stderr).toContain('Inventory must say');
 });
 it('names closing tags fully in the raw HTML message', () => {
  const out = run(evidence('rev abc123 `npm test` 4 passed </summary> done.'));
  expect(out.status).toBe(1); expect(out.stderr).toContain('raw HTML </summary>');
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
