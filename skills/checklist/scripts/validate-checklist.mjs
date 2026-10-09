#!/usr/bin/env node
// Completion gate for a Checklist record. It checks the record's structure and
// recorded state; it cannot prove that the work itself behaves correctly.
// The format is deliberately strict: anything that could hide or disguise an
// entry is rejected rather than interpreted.
import { readFileSync } from 'node:fs';

const USAGE = 'usage: validate-checklist.mjs <checklist.md> [--baseline <earlier-copy.md>]';
const SECTIONS = ['Request', 'Definition of Complete', 'Items', 'Decisions', 'Pre-Mortem',
  'Exclusions', 'Change Log', 'Verification', 'Close-Out', 'Resume'];
const ITEM_FIELDS = ['Source', 'Accept', 'Verify', 'Evidence', 'Depends on', 'Status', 'Reason', 'Authority'];
const STATUSES = new Map([['blocked', 'BLOCKED'], ['waived', 'WAIVED'], ['notapplicable', 'NOT APPLICABLE']]);
const ITEM = /^[-*+][ \t]+\[([ xX])\][ \t]+(C-\d+)[ \t]+\[(build|release)\][ \t]+(\S.*)$/i;
const FINDING = /^[-*+][ \t]+\[([ xX])\][ \t]+(F-\d+)[ \t]+(\S.*)$/i;
const FIELD = /^[-*+][ \t]+([A-Za-z][A-Za-z -]{0,30}?)[ \t]*:[ \t]*(.*)$/;
// A task checkbox as GitHub renders it: [ ], [x] or [X] followed by whitespace.
const BOX = /^([-*+]|\d+[.)])[ \t]+\[[ xX]\](?=[ \t]|$)/;
const LIST = /^([-*+]|\d+[.)])[ \t]/;
// What a reader would take for an entry: a checkbox-like bracket directly before an item or finding ID.
const ENTRY_LIKE = /\[[^\]]?\][ \t]*[CF]-\d+/i;
const INVISIBLE = /[­​-‏⁠-⁤﻿]/g;
const HYPHENS = /[‐-―−﹘﹣－]/g;
const ISO_TIME = /\b(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?Z)/g;
ITEM.example = '- [ ] C-001 [build] Outcome';
FINDING.example = '- [ ] F-001 Finding';

// Words that, on their own, say nothing was recorded.
const PLACEHOLDER_WORDS = new Set(('pending tbd tba todo to be determined decided confirmed added add will later n a ' +
  'na none nothing unknown not no yet run ran tested verified checked started done skipped skip untested unverified ' +
  'see above below still waiting wait for now needed required recorded written created provided given available ' +
  'applicable it this that the is was been has have evidence result results data here there').split(' '));
// Words that only assert success; evidence made of nothing else names no check or artifact.
const ASSERTIONS = new Set(('all every everything test tests check checks build builds suite are were and ok okay ' +
  'pass passes passed passing works work worked working verify complete completed fixed implemented yes true green ' +
  'success successful successfully confirmed looks good lgtm fine as expected correctly correct manually manual ' +
  'locally visually by hand me i we myself my should would seems appears probably on at').split(' '));
// Something inspectable besides a date or clock time: a digit (count, revision), code span, URL, path or file name.
const ANCHOR = /\d|`[^`]+`|https?:\/\/|\w\/\w|\w\.[a-z]{2,4}\b/i;
const UNRECORDED = /^(?:(?:todo|tbd|tba|pending)(?=$|\s*[:–—,.;(]|\s+-)|(?:not (?:yet )?(?:tested|run|verified|checked|done|started|recorded)|to be \w+|skipped|untested|unverified|none yet|no evidence)\b)/i;
const FUTURE_WORK = /\bto be (?:assigned|written|decided|determined|done|recorded|added|confirmed|run)\b/i;
const CORRECTION = /\b(?:correct(?:ed|ion)?|remov(?:ed|al)|replac(?:ed|ement)|supersed(?:ed|es)|split|merged|reworded|renamed|narrowed|broadened|duplicat(?:e|ed)|erroneous|withdr(?:ew|awn)|deleted|weakened|tightened|loosened|clarified)\b/i;
const FIELD_CHANGE = /\b(?:accept|acceptance|verify|verification|outcome|stage)\b[^.;]*\bchanged\b|\bchanged\b[^.;]*\b(?:accept|acceptance|verify|verification|outcome|stage)\b/i;

const key = (text) => text.toLowerCase().replace(/[^a-z]/g, '');
const words = (text = '') => text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
const unstrike = (text = '') => text.replace(/~~[^~]*~~/g, ' ');
const plain = (text = '') => unstrike(text).replace(/[*_~`\\]/g, '').replace(/\s+/g, ' ').trim();
// The text a reader sees: no code spans, escapes, link targets, emphasis, or look-alike hyphens.
const rendered = (text) => text.replace(/`[^`]*`/g, ' ').replace(/\\(.)/g, '$1').replace(/\[([^\]\s][^\]]*)\]\([^)]*\)/g, '$1')
  .replace(/[*_~]/g, '').replace(HYPHENS, '-');
const placeholder = (text) => words(plain(text)).every((word) => PLACEHOLDER_WORDS.has(word));
const assertionOnly = (text) => words(plain(text)).filter((word) => /\p{L}/u.test(word))
  .every((word) => ASSERTIONS.has(word) || PLACEHOLDER_WORDS.has(word));
const anchored = (text) => ANCHOR.test(unstrike(text).replace(/\b\d{4}-\d{2}-\d{2}(?:T[\d:.]+Z?)?\b/g, ' ').replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, ' '));
const marked = (text) => {
  const value = unstrike(text).replace(/[*_`]/g, '').trim().replace(/^[[(]+/, '');
  return /^(?:STALE|FAILED|INVALIDATED)(?![A-Za-z])/.test(value) || /^(?:stale|failed|invalidated)\s*[:\-–—.)\]]/i.test(value);
};
const negated = (text = '') => {
  const value = plain(text).replace(/^[\s"'([{<\-–—]+/, '');
  return /^(?:none|no|not|n\/a|nobody|unknown)\b/i.test(value) || /\b(?:none given|no authority|not given|not authori[sz]ed)\b/i.test(value);
};
const list = (values) => (values.length ? values.join(',') : 'none');
const idPattern = (id) => new RegExp(`\\b${id}\\b`);

// Returns the non-fenced lines with their section, keeping line numbers.
function scan(text, errors) {
  const lines = [];
  const seen = new Set();
  let section = null;
  let fence = null;
  text.replace(/^﻿/, '').split(/\r?\n/).forEach((raw, index) => {
    const n = index + 1;
    const line = raw.replace(/\t/g, '    ').replace(INVISIBLE, '');
    const indent = line.length - line.trimStart().length;
    if (fence) {
      const close = /^( *)(`{3,}|~{3,}) *$/.exec(line);
      if (close && close[2][0] === fence.char && close[2].length >= fence.length && close[1].length <= fence.indent + 3) { fence = null; return; }
      // A fence opened inside a list item ends with that item.
      if (!(fence.indent >= 2 && line.trim() && indent < fence.indent)) return;
      fence = null;
    }
    const open = /^( *)(`{3,}|~{3,})(.*)$/.exec(line);
    if (open && !(open[2][0] === '`' && open[3].includes('`'))) {
      fence = { char: open[2][0], length: open[2].length, indent: open[1].length, line: n };
      return;
    }
    const visible = line.replace(/`[^`]*`/g, ' ');
    if (visible.includes('<!--') || visible.includes('-->')) errors.push(`line ${n}: HTML comments are not allowed; they can hide entries`);
    else if (/^ *<\/?[A-Za-z][A-Za-z0-9-]*(?:[ >/]|$)/.test(line)) errors.push(`line ${n}: raw HTML is not allowed; write plain Markdown`);
    const heading = /^ {0,3}(#{1,6})[ \t]+(.*)$/.exec(line);
    if (heading && heading[1].length <= 2) {
      section = SECTIONS.find((name) => key(name) === key(heading[2])) ?? null;
      if (section && seen.has(section)) errors.push(`line ${n}: duplicate section "## ${section}"`);
      if (section) seen.add(section);
      return;
    }
    lines.push({ n, line, section });
  });
  if (fence) errors.push(`line ${fence.line}: code fence is never closed`);
  return { lines, sections: seen };
}

// Parses top-level checkbox entries and their indented "- Field: value" children.
function entries(lines, { head, fields, top = [], strict }, errors, parsed) {
  const result = [];
  const topValues = {};
  let entry = null;
  let child = null;
  let last = null;
  let lastTop = null;
  let continues = false;
  const append = (text) => {
    if (lastTop) topValues[lastTop] += ` ${text}`;
    else if (last) entry.fields[last] += ` ${text}`;
    else entry.outcome += ` ${text}`;
  };
  for (const { n, line } of lines) {
    if (!line.trim()) { continues = false; continue; }
    const indent = line.length - line.trimStart().length;
    const body = line.trim();
    if (indent === 0) {
      const entryLike = !BOX.test(body) && ENTRY_LIKE.test(rendered(body));
      // A wrapped line at column 0 directly after entry text is a lazy continuation, as in CommonMark.
      if (continues && (entry || lastTop) && !entryLike && !LIST.test(body) && !body.startsWith('#') && !body.startsWith('|')) { append(body); continue; }
      entry = null; child = null; last = null; lastTop = null; continues = false;
      if (entryLike) {
        parsed.add(n);
        errors.push(`line ${n}: cannot parse "${body}"; expected "${head.example}"`);
      } else if (BOX.test(body)) {
        const match = head.exec(body);
        parsed.add(n);
        if (!match) { errors.push(`line ${n}: cannot parse "${body}"; expected "${head.example}"`); continue; }
        entry = { line: n, checked: match[1] !== ' ', id: match[2].toUpperCase(), outcome: match.at(-1).trim(), fields: {}, match };
        result.push(entry); continues = true;
      } else if (LIST.test(body)) {
        const field = FIELD.exec(body);
        const name = field && top.find((candidate) => key(candidate) === key(field[1]));
        if (name) {
          if (name in topValues) errors.push(`line ${n}: duplicate ${name}`);
          topValues[name] = field[2].trim(); lastTop = name; continues = true;
        } else if (strict) {
          errors.push(`line ${n}: list entry without a checkbox; write "${head.example}" or move prose out of the list`);
        } else if (/\b[CF]-\d+\b/.test(rendered(body))) {
          errors.push(`line ${n}: an entry naming an ID must be a checkbox entry such as "${head.example}"`);
        }
      } else if (strict && body.startsWith('|') && /\bC-\d+\b/.test(rendered(body))) {
        errors.push(`line ${n}: items cannot be table rows; write "${head.example}"`);
      }
      continue;
    }
    if (BOX.test(body)) { parsed.add(n); errors.push(`line ${n}: checkbox entries must start at the beginning of the line`); continue; }
    if (lastTop) { append(body); continue; }
    if (!entry) {
      if (strict && FIELD.test(body)) errors.push(`line ${n}: field outside an item; fields belong directly under "${head.example}"`);
      continue;
    }
    continues = true;
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

function parse(text, errors, now) {
  const { lines, sections } = scan(text, errors);
  const parsed = new Set();
  const inSection = (name) => lines.filter((line) => line.section === name);
  const { result: items } = entries(inSection('Items'), { head: ITEM, fields: ITEM_FIELDS, strict: true }, errors, parsed);
  for (const item of items) item.stage = item.match[3].toLowerCase();
  const closeOut = entries(inSection('Close-Out'), { head: FINDING, fields: ['Resolution'], top: ['Review', 'Inventory', 'Result'] }, errors, parsed);
  for (const { n, line } of lines) {
    const text = rendered(line).replace(/^[\s>]+/, '');
    if (!parsed.has(n) && ENTRY_LIKE.test(text)) {
      errors.push(`line ${n}: looks like a checklist entry but is not one; items go at the start of a line under "## Items" and findings under "## Close-Out"`);
    }
  }
  // Event times are read from the clock, so none can be later than now. Only the first time in a log
  // or verification entry, or in an evidence value, is an event time; later ones may be deadlines.
  const events = [...lines.filter((line) => ['Change Log', 'Verification'].includes(line.section) && /^[-*+] /.test(line.line.trim()))
    .map(({ n, line }) => [n, line]), ...items.map((item) => [item.line, item.fields.Evidence ?? ''])];
  for (const [n, text] of events) {
    const stamp = text.match(ISO_TIME)?.[0];
    if (stamp && now !== null && Date.parse(stamp) > now + 10 * 60 * 1000) errors.push(`line ${n}: timestamp ${stamp} is in the future; take event times from the clock`);
  }
  const changeLog = inSection('Change Log').map(({ line }) => line.trim()).filter(Boolean);
  const filled = (name) => inSection(name).some(({ line }) => line.trim());
  return { sections, filled, items, findings: closeOut.result, review: closeOut.top, changeLog };
}

function validate(record, errors, notes) {
  const { sections, filled, items, findings, review, changeLog } = record;
  for (const name of SECTIONS) if (!sections.has(name)) errors.push(`missing section "## ${name}"`);
  for (const name of ['Request', 'Definition of Complete']) if (sections.has(name) && !filled(name)) errors.push(`section "## ${name}" is empty`);
  if (sections.has('Items') && !items.length) errors.push('no checklist items found under "## Items"');
  const byId = new Map();
  for (const item of items) {
    if (byId.has(item.id)) errors.push(`line ${item.line}: duplicate item ID ${item.id}`);
    else byId.set(item.id, item);
  }
  // A waiver or non-applicability needs an entry naming both the item and the exception, not merely the ID.
  const exceptionWord = { WAIVED: /\bwaive/i, 'NOT APPLICABLE': /not.?applicable|\bn\/a\b|inapplicable|does ?n[o']t apply/i };
  const logged = (id, status) => changeLog.some((line) => idPattern(id).test(line) && exceptionWord[status].test(line));
  for (const item of items) {
    const at = `line ${item.line}: ${item.id}`;
    const { fields } = item;
    for (const name of ['Source', 'Accept', 'Verify']) if (placeholder(fields[name])) errors.push(`${at}: needs ${name}`);
    if (!('Evidence' in fields)) errors.push(`${at}: needs an Evidence field ("Pending." until verified)`);
    if ('Status' in fields) {
      item.status = STATUSES.get(key(fields.Status));
      if (!item.status) errors.push(`${at}: Status must be BLOCKED, WAIVED or NOT APPLICABLE`);
      if (item.checked) errors.push(`${at}: an exception keeps its box unchecked; only [x] means verified`);
      const label = item.status ?? fields.Status;
      if (placeholder(fields.Reason)) errors.push(`${at}: ${label} needs a Reason`);
      if (placeholder(fields.Evidence)) errors.push(`${at}: ${label} needs Evidence for the exception`);
      if (placeholder(fields.Authority) || negated(fields.Authority)) errors.push(`${at}: ${label} needs the Authority that established it`);
      if (item.status && item.status !== 'BLOCKED' && !logged(item.id, item.status)) {
        errors.push(`${at}: ${item.status} must be recorded in a Change Log entry naming ${item.id}`);
      }
    } else if (item.checked) {
      const evidence = fields.Evidence ?? '';
      if (placeholder(evidence) || assertionOnly(evidence) || UNRECORDED.test(plain(evidence)) || !anchored(evidence)) {
        errors.push(`${at}: checked item needs evidence naming a check, observation or artifact (a command, path, URL, revision or count), found "${evidence}"`);
      } else if (marked(evidence)) {
        errors.push(`${at}: evidence is marked stale or failed; uncheck the item until it is verified again`);
      }
    }
    if ('Depends on' in fields) {
      const value = plain(fields['Depends on']);
      const ids = /^none\b/i.test(value) ? [] : value.match(/\bC-\d+\b/gi)?.map((id) => id.toUpperCase());
      if (!ids) errors.push(`${at}: Depends on must list item IDs or None`);
      for (const id of ids ?? []) {
        const dependency = byId.get(id);
        if (id === item.id) errors.push(`${at}: depends on itself`);
        else if (!dependency) errors.push(`${at}: depends on unknown item ${id}`);
        else if (item.checked && !dependency.checked && !['WAIVED', 'NOT APPLICABLE'].includes(STATUSES.get(key(dependency.fields.Status ?? '')))) {
          errors.push(`${at}: checked but depends on open ${id}; verify ${id} or reopen ${item.id}`);
        }
      }
    }
  }
  if (items.length && items.every((item) => item.status === 'NOT APPLICABLE')) errors.push('every item is NOT APPLICABLE; a checklist needs at least one required item');
  if (items.some((item) => item.status === 'WAIVED') && !items.some((item) => item.checked)) errors.push('every required item is waived or open; nothing was verified');
  const seen = new Set();
  for (const finding of findings) {
    if (seen.has(finding.id)) errors.push(`line ${finding.line}: duplicate finding ID ${finding.id}`);
    seen.add(finding.id);
    if (finding.checked && placeholder(finding.fields.Resolution)) errors.push(`line ${finding.line}: ${finding.id}: resolved finding needs a Resolution`);
  }
  const [reviewText, inventory, result] = [plain(review.Review), plain(review.Inventory), plain(review.Result)];
  const reviewer = /^(independent|self)\b/i.exec(reviewText)?.[1].toLowerCase();
  if (reviewer === 'self' && !/not independent/i.test(reviewText)) errors.push('Close-Out: a self review must say it was not independent');
  // The review counts only when it happened, its inventory was recorded, and its result passed.
  const passed = /^pass(?:ed|es)?\b(?!\s*(?:\/|or\b))/i.test(result);
  const future = [reviewText, inventory, result].some((value) => FUTURE_WORK.test(value));
  if (reviewer && !placeholder(inventory) && passed && !future) return reviewer;
  if (review.Result !== undefined && !placeholder(result) && !passed) notes.push('Close-Out Result does not start with PASS, so the review does not count yet');
  return 'pending';
}

function ratchet(record, baseline, errors) {
  const current = record.changeLog;
  const earlier = baseline.changeLog;
  const kept = earlier.every((line, index) => current[index] === line);
  if (!kept) errors.push('Change Log is append-only: the baseline entries must stay unchanged, in order, before any new entry');
  const added = kept ? current.slice(earlier.length) : current.filter((line) => !earlier.includes(line));
  const corrected = (id) => added.some((line) => idPattern(id).test(line)
    && (CORRECTION.test(line) || FIELD_CHANGE.test(line)) && !/\bno (?:changes?|corrections?)\b/i.test(line));
  const same = (a = '', b = '') => a.replace(/\s+/g, ' ').trim() === b.replace(/\s+/g, ' ').trim();
  const now = new Map(record.items.map((item) => [item.id, item]));
  for (const old of baseline.items) {
    const item = now.get(old.id);
    if (!item) {
      if (!corrected(old.id)) errors.push(`${old.id} was removed without a new Change Log entry recording the correction`);
      continue;
    }
    const changed = [['stage', old.stage, item.stage], ['outcome', old.outcome, item.outcome],
      ['Accept', old.fields.Accept, item.fields.Accept], ['Verify', old.fields.Verify, item.fields.Verify]]
      .filter(([, before, after]) => !same(before, after)).map(([name]) => name);
    if (changed.length && !corrected(old.id)) errors.push(`${old.id}: ${changed.join(', ')} changed without a new Change Log entry recording the correction`);
  }
  const findings = new Set(record.findings.map((finding) => finding.id));
  for (const old of baseline.findings) {
    if (!findings.has(old.id) && !corrected(old.id)) errors.push(`${old.id} was removed without a new Change Log entry recording the correction`);
  }
  // An ID the baseline log records as removed stays retired.
  const present = new Set(baseline.items.map((item) => item.id));
  const retired = new Set(earlier.filter((line) => /\b(?:remov|delet|withdr|merged|supersed|duplicat)/i.test(line))
    .flatMap((line) => line.match(/\bC-\d+\b/g) ?? []).filter((id) => !present.has(id)));
  for (const item of record.items) if (retired.has(item.id)) errors.push(`line ${item.line}: ${item.id} was removed earlier; IDs are never reused`);
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
  const notes = [];
  const record = parse(text, errors, Date.now());
  const review = validate(record, errors, notes);
  if (baselineFile !== null) {
    const baseline = parse(earlier, [], null);
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
  // A pending review is actionable work, so it keeps the record OPEN even when other items are blocked.
  let status = 'CHECKLIST OPEN';
  if (!open.length && !findingsOpen.length && review !== 'pending') {
    if (blocked.length) status = 'CHECKLIST BLOCKED';
    else status = waived.length ? 'CHECKLIST ACCEPTED WITH EXCEPTIONS' : 'CHECKLIST VERIFIED COMPLETE';
  }
  console.log([status, `verified=${verified.length}/${required.length}`, `open=${list(open)}`, `blocked=${list(blocked)}`,
    `waived=${list(waived)}`, `not_applicable=${list(ids('NOT APPLICABLE'))}`, `findings_open=${list(findingsOpen)}`,
    `review=${review}`, `build=${stage('build')}`, `release=${stage('release')}`, `file=${file}`].join(' | '));
  for (const note of notes) console.error(`note: ${note}`);
  return status === 'CHECKLIST VERIFIED COMPLETE' || status === 'CHECKLIST ACCEPTED WITH EXCEPTIONS' ? 0 : 2;
}

process.exitCode = main(process.argv.slice(2));
