#!/usr/bin/env node
// Checks a final SHIP PROOF or SHIP BLOCKED line against the field rules in SKILL.md.
// It checks the line's shape and honesty markers, not that the release itself happened.
// Usage: node validate-proof.mjs "<line>"   Exit 0 valid, 1 invalid.
const line = (process.argv[2] ?? '').trim();
const [head, ...parts] = line.split(/\s+\|\s+/);
const fields = Object.fromEntries(parts.map((part) => { const at = part.indexOf('='); return at < 0 ? [part, ''] : [part.slice(0, at).trim(), part.slice(at + 1).trim()]; }));
const errors = [];
const need = (keys) => { for (const key of keys) if (!fields[key]) errors.push(`missing ${key}=`); };
const SHA = /\b[0-9a-f]{7,40}\b/i;
const placeholder = (key) => /<[^>]*>|\bTBD\b|^…$|^\.\.\.$/i.test(fields[key] ?? '');

if (head === 'SHIP PROOF') {
  need(['commit', 'target', 'checks', 'ci', 'publish', 'deploy', 'live', 'at']);
  if (fields.commit && !SHA.test(fields.commit)) errors.push('commit= must name the released SHA');
  for (const key of ['ci', 'deploy']) if (fields[key] && !/^(GREEN|N\/A)\s+\S/.test(fields[key])) errors.push(`${key}= must be "GREEN <evidence>" or "N/A <reason>"`);
  for (const key of ['publish', 'live']) if (fields[key] && !/^VERIFIED\s+\S/.test(fields[key])) errors.push(`${key}= must be "VERIFIED <evidence>"`);
  if (fields.checks && /^(passed|ok|green|all)$/i.test(fields.checks)) errors.push('checks= must name the checks and their results');
  if (fields.at && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?Z$/.test(fields.at)) errors.push('at= must be a UTC timestamp such as 2026-10-29T14:05:00Z');
  else if (fields.at && Date.parse(fields.at) > Date.now() + 10 * 60 * 1000) errors.push('at= is in the future; take it from the clock');
} else if (head === 'SHIP BLOCKED') {
  need(['stage', 'revision', 'reason', 'evidence', 'next']);
  if (fields.revision && !SHA.test(fields.revision) && fields.revision !== 'none') errors.push('revision= must be a known SHA or "none"');
} else errors.push('line must start with "SHIP PROOF" or "SHIP BLOCKED"');
for (const key of Object.keys(fields)) if (placeholder(key)) errors.push(`${key}= still holds a placeholder`);

if (errors.length) { console.log(`PROOF INVALID | errors=${errors.length}`); for (const error of errors) console.error(`- ${error}`); process.exitCode = 1; }
else console.log(`PROOF VALID | ${head}`);
