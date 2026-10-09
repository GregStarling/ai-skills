#!/usr/bin/env node
// Completion gate for a Checklist record. It checks the record's structure and
// recorded state; it cannot prove that the work itself behaves correctly.
import { readFileSync } from 'node:fs';

const USAGE = 'usage: validate-checklist.mjs <checklist.md> [--baseline <earlier-copy.md>]';
const SECTIONS = ['Request', 'Definition of Complete', 'Items', 'Decisions', 'Pre-Mortem',
  'Exclusions', 'Change Log', 'Verification', 'Close-Out', 'Resume'];
const ITEM_FIELDS = ['Source', 'Accept', 'Verify', 'Evidence', 'Depends on', 'Status', 'Reason', 'Authority'];
const STATUSES = { blocked: 'BLOCKED', waived: 'WAIVED', notapplicable: 'NOT APPLICABLE' };
const ITEM = /^[-*+] \[([ xX])\] +(C-\d+) +\[(build|release)\] +(\S.*)$/i;
const FINDING = /^[-*+] \[([ xX])\] +(F-\d+) +(\S.*)$/i;
const FIELD = /^[-*+] +([A-Za-z][A-Za-z -]*?) *: *(.*)$/;
const PLACEHOLDERS = new Set(['', 'pending', 'tbd', 'tba', 'todo', 'na', 'none', 'unknown', 'notrun',
  'notyetrun', 'notverified', 'seeabove', 'seebelow']);
// Words that only assert success; evidence made of nothing else names no check or artifact.
const ASSERTIONS = new Set(('all the it its everything test tests check checks build builds suite is are was were ' +
  'has have been and ok okay pass passes passed passing done works work worked working verified verify complete ' +
  'completed fixed implemented yes true green success successful successfully tested checked confirmed looks good ' +
  'lgtm fine as expected now correctly correct manually manual locally visually by hand me i we myself').split(' '));

const key = (text) => text.toLowerCase().replace(/[^a-z]/g, '');
const placeholder = (text = '') => PLACEHOLDERS.has(key(text)) || /^\s*(pending|tbd|todo)\b/i.test(text);
const assertion = (text) => text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).every((word) => ASSERTIONS.has(word));
const list = (values) => (values.length ? values.join(',') : 'none');

function sections(text, errors) {
  const found = new Map();
  let current = null;
  let fence = null;
  text.replace(/^﻿/, '').split(/\r?\n/).forEach((raw, index) => {
    const line = raw.replace(/\t/g, '    ');
    const marker = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    if (fence) {
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = null;
      return;
    }
    if (marker) { fence = marker[1]; return; }
    const heading = /^(#{1,2}) +(.+?)[ #]*$/.exec(line);
    if (heading) {
      current = null;
      if (heading[1] === '#') return;
      const name = SECTIONS.find((section) => key(section) === key(heading[2]));
      if (!name) return;
      if (found.has(name)) errors.push(`line ${index + 1}: duplicate section "## ${name}"`);
      current = []; found.set(name, current);
      return;
    }
    if (current) current.push({ n: index + 1, line });
  });
  return found;
}

// Parses top-level checkbox entries and their indented "- Field: value" children.
function entries(lines, { head, fields, top = [], strict }, errors) {
  const result = [];
  const topValues = {};
  let entry = null;
  let child = null;
  let last = null;
  let lastTop = null;
  for (const { n, line } of lines) {
    if (!line.trim()) continue;
    const indent = line.length - line.trimStart().length;
    const body = line.trim();
    const box = /^([-*+]|\d+[.)]) \[[^\]]*\]/.test(body);
    if (indent === 0) {
      entry = null; child = null; last = null; lastTop = null;
      const field = FIELD.exec(body);
      const topName = !box && field && top.find((name) => key(name) === key(field[1]));
      if (box) {
        const match = head.exec(body);
        if (!match) { errors.push(`line ${n}: cannot parse "${body}"; expected ${head.example}`); continue; }
        entry = { line: n, checked: match[1] !== ' ', id: match[2].toUpperCase(), fields: {}, head: match };
        result.push(entry);
      } else if (topName) {
        topValues[topName] = field[2].trim(); lastTop = topName;
      } else if (strict && /^([-*+]|\d+[.)]) /.test(body)) {
        errors.push(`line ${n}: list entry without a checkbox; write "${head.example}" or move prose out of the list`);
      }
      continue;
    }
    if (box) { errors.push(`line ${n}: checkbox entries must start at the beginning of the line`); continue; }
    if (lastTop) { topValues[lastTop] += ` ${body}`; continue; }
    if (!entry) continue;
    if (child === null) child = indent;
    if (indent === child) {
      const field = FIELD.exec(body);
      const name = field && fields.find((candidate) => key(candidate) === key(field[1]));
      last = null;
      if (!name) { errors.push(`line ${n}: ${entry.id}: expected "- Field: value" using ${fields.join(', ')}`); continue; }
      if (name in entry.fields) errors.push(`line ${n}: ${entry.id}: duplicate ${name}`);
      entry.fields[name] = field[2].trim(); last = name;
    } else if (indent > child && last) {
      entry.fields[last] += ` ${body}`;
    } else {
      errors.push(`line ${n}: ${entry.id}: inconsistent indentation`);
    }
  }
  return { result, top: topValues };
}
ITEM.example = '"- [ ] C-001 [build] Outcome"';
FINDING.example = '"- [ ] F-001 Finding"';

function parse(text, errors) {
  const found = sections(text, errors);
  const { result: items } = entries(found.get('Items') ?? [], { head: ITEM, fields: ITEM_FIELDS, strict: true }, errors);
  for (const item of items) {
    item.stage = item.head[3].toLowerCase();
    item.outcome = item.head[4].trim();
  }
  const closeOut = entries(found.get('Close-Out') ?? [], { head: FINDING, fields: ['Resolution'], top: ['Review', 'Inventory', 'Result'] }, errors);
  const changeLog = (found.get('Change Log') ?? []).map(({ line }) => line.trim()).filter(Boolean);
  return { found, items, findings: closeOut.result, review: closeOut.top, changeLog };
}

function validate(record, errors) {
  const { found, items, findings, review, changeLog } = record;
  for (const name of SECTIONS) if (!found.has(name)) errors.push(`missing section "## ${name}"`);
  for (const name of ['Request', 'Definition of Complete']) {
    if (found.has(name) && !found.get(name).some(({ line }) => line.trim())) errors.push(`section "## ${name}" is empty`);
  }
  if (found.has('Items') && !items.length) errors.push('no checklist items found under "## Items"');
  const byId = new Map();
  for (const item of items) {
    if (byId.has(item.id)) errors.push(`line ${item.line}: duplicate item ID ${item.id}`);
    else byId.set(item.id, item);
  }
  // The entry must name both the item and the exception, not merely mention the ID (e.g. its creation).
  const logged = (id, status) => changeLog.some((line) => new RegExp(`\\b${id}\\b`).test(line)
    && (status === 'WAIVED' ? /\bwaive/i : /not.?applicable|\bn\/a\b|inapplicable/i).test(line));
  for (const item of items) {
    const at = `line ${item.line}: ${item.id}`;
    const { fields } = item;
    for (const name of ['Source', 'Accept', 'Verify']) if (placeholder(fields[name])) errors.push(`${at}: needs ${name}`);
    if (!('Evidence' in fields)) errors.push(`${at}: needs an Evidence field ("Pending." until verified)`);
    if ('Status' in fields) {
      item.status = STATUSES[key(fields.Status)];
      if (!item.status) errors.push(`${at}: Status must be BLOCKED, WAIVED or NOT APPLICABLE`);
      if (item.checked) errors.push(`${at}: an exception keeps its box unchecked; only [x] means verified`);
      if (placeholder(fields.Reason)) errors.push(`${at}: ${fields.Status} needs a Reason`);
      if (placeholder(fields.Evidence)) errors.push(`${at}: ${fields.Status} needs Evidence for the exception`);
      if (item.status && item.status !== 'BLOCKED') {
        if (placeholder(fields.Authority)) errors.push(`${at}: ${item.status} needs the Authority that approved it`);
        if (!logged(item.id, item.status)) errors.push(`${at}: ${item.status} must be recorded in a Change Log entry naming ${item.id}`);
      }
    } else if (item.checked) {
      const evidence = fields.Evidence ?? '';
      if (placeholder(evidence) || assertion(evidence)) {
        errors.push(`${at}: checked item needs evidence naming a check, observation or artifact, found "${evidence}"`);
      } else if (/^\s*(stale|failed|invalidated)\s*:/i.test(evidence)) {
        errors.push(`${at}: evidence is marked stale or failed; uncheck the item until it is verified again`);
      }
    }
    if ('Depends on' in fields) {
      const value = fields['Depends on'];
      const ids = /^\s*none\.?\s*$/i.test(value) ? [] : value.match(/\bC-\d+\b/gi)?.map((id) => id.toUpperCase());
      if (!ids) errors.push(`${at}: Depends on must list item IDs or None`);
      for (const id of ids ?? []) {
        const dependency = byId.get(id);
        if (id === item.id) errors.push(`${at}: depends on itself`);
        else if (!dependency) errors.push(`${at}: depends on unknown item ${id}`);
        else if (item.checked && !dependency.checked && !['WAIVED', 'NOT APPLICABLE'].includes(STATUSES[key(dependency.fields.Status ?? '')])) {
          errors.push(`${at}: checked but depends on open ${id}; verify ${id} or reopen ${item.id}`);
        }
      }
    }
  }
  const seen = new Set();
  for (const finding of findings) {
    if (seen.has(finding.id)) errors.push(`line ${finding.line}: duplicate finding ID ${finding.id}`);
    seen.add(finding.id);
    if (finding.checked && placeholder(finding.fields.Resolution)) errors.push(`line ${finding.line}: ${finding.id}: resolved finding needs a Resolution`);
  }
  const reviewer = /^\s*(independent|self)\b/i.exec(review.Review ?? '')?.[1].toLowerCase();
  return reviewer && !placeholder(review.Inventory) && !placeholder(review.Result) ? reviewer : 'pending';
}

function ratchet(record, baseline, errors) {
  const current = record.changeLog;
  const earlier = new Set(baseline.changeLog);
  for (const line of earlier) if (!current.includes(line)) errors.push(`Change Log is append-only; baseline entry edited or removed: "${line}"`);
  const added = current.filter((line) => !earlier.has(line));
  const logged = (id) => added.some((line) => new RegExp(`\\b${id}\\b`).test(line));
  const now = new Map(record.items.map((item) => [item.id, item]));
  const same = (a = '', b = '') => a.replace(/\s+/g, ' ').trim() === b.replace(/\s+/g, ' ').trim();
  for (const old of baseline.items) {
    const item = now.get(old.id);
    if (!item) {
      if (!logged(old.id)) errors.push(`${old.id} was removed without a new Change Log entry`);
      continue;
    }
    const changed = [['stage', old.stage, item.stage], ['outcome', old.outcome, item.outcome],
      ['Accept', old.fields.Accept, item.fields.Accept], ['Verify', old.fields.Verify, item.fields.Verify]]
      .filter(([, before, after]) => !same(before, after)).map(([name]) => name);
    if (changed.length && !logged(old.id)) errors.push(`${old.id}: ${changed.join(', ')} changed without a new Change Log entry`);
  }
}

function main(argv) {
  let file = null;
  let baselineFile = null;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '-h' || arg === '--help') { console.log(USAGE); return 0; }
    if (arg === '--baseline' && argv[index + 1] && !baselineFile) baselineFile = argv[++index];
    else if (!arg.startsWith('-') && !file) file = arg;
    else { console.error(`unexpected argument: ${arg}\n${USAGE}`); return 1; }
  }
  if (!file) { console.error(USAGE); return 1; }
  const read = (path) => {
    try { return readFileSync(path, 'utf8'); } catch (error) { console.error(`cannot read ${path}: ${error.message}\n${USAGE}`); return null; }
  };
  const text = read(file);
  const earlier = baselineFile === null ? '' : read(baselineFile);
  if (text === null || earlier === null) return 1;

  const errors = [];
  const record = parse(text, errors);
  const review = validate(record, errors);
  if (baselineFile !== null) {
    const baselineErrors = [];
    const baseline = parse(earlier, baselineErrors);
    if (!baseline.items.length) errors.push(`baseline ${baselineFile} has no parseable items`);
    else ratchet(record, baseline, errors);
  }
  if (errors.length) {
    console.log(`CHECKLIST INVALID | errors=${errors.length} | file=${file}`);
    for (const error of errors) console.error(`- ${error}`);
    return 1;
  }

  const state = (item) => (item.checked ? 'verified' : item.status ?? 'open');
  const ids = (wanted) => record.items.filter((item) => state(item) === wanted).map((item) => item.id);
  const required = record.items.filter((item) => item.status !== 'NOT APPLICABLE');
  const verified = required.filter((item) => item.checked);
  const [open, blocked, waived] = [ids('open'), ids('BLOCKED'), ids('WAIVED')];
  const findingsOpen = record.findings.filter((finding) => !finding.checked).map((finding) => finding.id);
  const stage = (name) => {
    const inStage = required.filter((item) => item.stage === name);
    return `${inStage.filter((item) => item.checked).length}/${inStage.length}`;
  };
  let status = 'CHECKLIST OPEN';
  if (!open.length && !findingsOpen.length) {
    if (blocked.length) status = 'CHECKLIST BLOCKED';
    else if (review !== 'pending') status = waived.length ? 'CHECKLIST ACCEPTED WITH EXCEPTIONS' : 'CHECKLIST VERIFIED COMPLETE';
  }
  console.log([status, `verified=${verified.length}/${required.length}`, `open=${list(open)}`, `blocked=${list(blocked)}`,
    `waived=${list(waived)}`, `not_applicable=${list(ids('NOT APPLICABLE'))}`, `findings_open=${list(findingsOpen)}`,
    `review=${review}`, `build=${stage('build')}`, `release=${stage('release')}`, `file=${file}`].join(' | '));
  return status === 'CHECKLIST VERIFIED COMPLETE' || status === 'CHECKLIST ACCEPTED WITH EXCEPTIONS' ? 0 : 2;
}

process.exitCode = main(process.argv.slice(2));
