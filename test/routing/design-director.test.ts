import {afterEach, describe, expect, it} from 'vitest';
import {mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

const validator = resolve('skills/design-director/scripts/validate-proposal.mjs');
const temporary: string[] = [];
afterEach(() => { for (const path of temporary.splice(0)) rmSync(path, {recursive: true, force: true}); });

// Synthetic contract fixtures, not evidence that any product design was verified.
function proposal(resolution: 'create' | 'amend' = 'create') {
 const evidence = {
  schema_version: 'design_evidence.v1', evidence_id: 'direction', source_class: 'product_direction',
  strength: 'primary', claim: 'Keep recovery visible.', summary: 'Fixture product direction.',
  observed_at: '2026-09-19T00:00:00Z', surface_ids: ['editor'], clause_ids: ['recovery'],
  references: [{kind: 'file', ref_id: 'brief', path: 'brief.md', sha256: 'a'.repeat(64)}],
 };
 const verification = {method: 'visual_judgment', description: 'Inspect the recovery flow.', proof: []};
 return {
  schema_version: 'design_resolution.v1', resolution, rationale: 'Preserve recoverable work.',
  evidence: [structuredClone(evidence)],
  expected_base: resolution === 'amend' ? {revision_id: 'base', subject_sha256: 'b'.repeat(64)} : null,
  proposal: {
   work_kind: 'refinement', maturity: 'maturing',
   surfaces: [{surface_id: 'editor', user: 'Author', job: 'Edit a draft', context: 'Recover from errors',
    mode: 'operate', platform: 'web', frequency: 'frequent', risk: 'standard', density: 'balanced',
    content_ranges: ['short and long drafts'], important_states: ['error'], protected_behaviors: ['retain draft']}],
   clauses: [{clause_id: 'recovery', domain: 'protected_behavior', lifecycle: 'established',
    statement: 'Retain valid work after a recoverable error.', rationale: 'Respect the product brief.',
    surface_ids: ['editor'], confidence: 0.8, evidence: [structuredClone(evidence)],
    verification: structuredClone(verification), revisit_triggers: ['Changed recovery requirements']}],
   unknowns: ['Live implementation has not been assessed by this fixture.'],
   change_set: {
    operations: [{operation: resolution === 'amend' ? 'replace' : 'add', clause_id: 'recovery',
     replaces_clause_id: resolution === 'amend' ? 'recovery' : null}],
    reason: 'Apply the supplied direction.', affected_surface_ids: ['editor'],
    expected_consequence: 'Recovery preserves user work.', evidence: [structuredClone(evidence)],
    verification: structuredClone(verification), rollback_revision_id: resolution === 'amend' ? 'base' : null,
   },
  },
 };
}
function check(value: unknown) {
 const cwd = mkdtempSync(join(tmpdir(), 'design-director-validator-')); temporary.push(cwd);
 writeFileSync(join(cwd, 'proposal.json'), JSON.stringify(value));
 // The installed helper must work from a consumer directory with no package.json.
 return spawnSync(process.execPath, [validator, 'proposal.json'], {cwd, encoding: 'utf8'});
}

describe('portable Design Director validator', () => {
 it.each(['not_applicable', 'preserve'])('accepts advisory %s without a proposal', resolution => {
  const result = check({schema_version: 'design_resolution.v1', resolution, rationale: 'No change proposed.',
   evidence: [], expected_base: null, proposal: null});
  expect(result.status).toBe(0); expect(result.stdout).toContain('PASS');
 });
 it.each(['create', 'amend'] as const)('accepts a structurally supported %s', resolution => {
  const result = check(proposal(resolution)); expect(result.status, result.stderr).toBe(0);
 });
 it('rejects attempts to change the universal floor', () => {
  const value = proposal(); value.proposal.clauses[0]!.clause_id = 'floor.accessibility';
  const result = check(value); expect(result.status).toBe(1); expect(result.stderr).toContain('universal floor');
 });
 it('rejects heuristic promotion to established product authority', () => {
  const value = proposal(); value.proposal.clauses[0]!.evidence[0]!.source_class = 'heuristic';
  const result = check(value); expect(result.status).toBe(1); expect(result.stderr).toContain('strong primary evidence');
 });
 it('rejects an amendment whose rollback does not match the expected base', () => {
  const value = proposal('amend'); value.proposal.change_set.rollback_revision_id = 'different-base';
  const result = check(value); expect(result.status).toBe(1); expect(result.stderr).toContain('rollback revision');
 });
 it('rejects unrelated primary evidence for a replacement', () => {
  const value = proposal('amend'); value.proposal.change_set.evidence[0]!.clause_ids = ['unrelated'];
  const result = check(value); expect(result.status).toBe(1); expect(result.stderr).toContain('clause-specific');
 });
 it('rejects a reference to an absent surface', () => {
  const value = proposal(); value.proposal.clauses[0]!.surface_ids = ['absent'];
  const result = check(value); expect(result.status).toBe(1); expect(result.stderr).toContain('unknown surface');
 });
});
