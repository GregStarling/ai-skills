#!/usr/bin/env node
// Completion gate for a CTO ledger: item states, evidence on done items, and whether item states and
// Definition of Shipped criteria permit SHIPPED. It does not see required review or release state, and it
// checks the recorded state, not that the work behaves correctly.
// Usage: node validate-ledger.mjs [.cto/ledger.md]
// Prints one gate line, then the final report status line. Exit 0 SHIPPED, 2 not shipped, 1 invalid.
import { readFileSync } from 'node:fs';

const file = process.argv[2] ?? '.cto/ledger.md';
let text;
try { text = readFileSync(file, 'utf8'); } catch (error) { console.error(`cannot read ${file}: ${error.message}`); process.exit(1); }
const STATES = ['todo', 'doing', 'done', 'blocked-technical', 'blocked-external'];
const section = (name) => { const m = new RegExp(`^##\\s+${name}\\s*$([\\s\\S]*?)(?=^##\\s|(?![\\s\\S]))`, 'im').exec(text); return m ? m[1] : null; };
const header = (label) => new RegExp(`^${label}:[ \\t]*(.*)$`, 'im').exec(text)?.[1].trim() ?? '';
const errors = [];

// Cells split on unescaped pipes; columns are found by header name, so their order does not matter.
const table = (section('Work Items') ?? '').split('\n').filter((l) => /^\s*\|/.test(l)).map((l) => l.trim().replace(/^\||(?<!\\)\|$/g, '').split(/(?<!\\)\|/).map((c) => c.trim()));
const columns = table[0]?.map((c) => c.toLowerCase().replace(/[`*]/g, '')) ?? [];
const col = (...names) => columns.findIndex((c) => names.includes(c));
const [statusAt, evidenceAt] = [col('status', 'state'), col('evidence')];
const idAt = [col('#', 'id'), col('item', 'item / original requirement')].find((i) => i >= 0) ?? (statusAt === 0 ? 1 : 0);
if (!table.length) errors.push('no "## Work Items" table');
else if (statusAt < 0) errors.push('Work Items table has no Status column');
const rows = table.slice(1).filter((r) => !r.every((c) => /^-*:?-+:?$|^$/.test(c)));
const items = rows.map((r, i) => ({ id: (r[idAt] || `row ${i + 1}`).split(/\s+/)[0], status: (r[statusAt] ?? '').replace(/[`*]/g, '').trim().toLowerCase(), evidence: evidenceAt < 0 ? '' : r[evidenceAt] ?? '' }));
for (const item of items) {
  if (!STATES.includes(item.status)) errors.push(`${item.id}: state "${item.status}" is not one of ${STATES.join(', ')}`);
  if (item.status === 'done' && (!item.evidence || /^(-|—|tbd|pending|n\/a)?$/i.test(item.evidence))) errors.push(`${item.id}: done without evidence`);
}
const criteria = (section('Definition of Shipped') ?? '').split('\n').filter((l) => /^\s*[-*]\s+\[[ xX]\]/.test(l));
const unmet = criteria.filter((l) => /\[ \]/.test(l)).length;
if (!criteria.length) errors.push('"## Definition of Shipped" has no "- [ ]" or "- [x]" criteria');

if (errors.length) { console.log(`LEDGER INVALID | errors=${errors.length} | file=${file}`); for (const e of errors) console.error(`- ${e}`); process.exit(1); }
const by = (state) => items.filter((i) => i.status === state).map((i) => i.id);
const list = (ids) => (ids.length ? ids.join(',') : 'none');
const [done, external] = [by('done'), by('blocked-external')];
const actionable = [...by('doing'), ...by('todo'), ...by('blocked-technical')];
const count = `items=${done.length}/${items.length}`;
console.log(`LEDGER OK | ${count} | todo=${list(by('todo'))} | doing=${list(by('doing'))} | blocked-technical=${list(by('blocked-technical'))} | blocked-external=${list(external)} | shipped_criteria=${criteria.length - unmet}/${criteria.length} | file=${file}`);

let status;
if (items.length && !actionable.length && !external.length && criteria.length && !unmet) {
  status = `CTO SHIPPED | ${count} | destination=${header('Delivery destination and authorization') || '<fill: destination>'} | review=<fill: role; result> | ledger=${file} | at=${new Date().toISOString()}`;
} else if (!actionable.length && external.length) {
  status = `CTO BLOCKED EXTERNALLY | ${count} | blocked=${list(external)} | need=<fill: exact action> | ledger=${file}`;
} else {
  const next = header('Next action') || actionable[0] || '<fill: next item>';
  status = `CTO INTERRUPTED | ${count} | last=${done.at(-1) ?? 'none'} | resume=${next} | ledger=${file}`;
}
console.log(status);
process.exitCode = status.startsWith('CTO SHIPPED') ? 0 : 2;
