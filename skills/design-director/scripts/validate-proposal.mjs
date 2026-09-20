#!/usr/bin/env node
import { readFileSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const USAGE = 'usage: validate-proposal.mjs <design-resolution.json>';
const SOURCE_CLASSES = new Set([
  'product_direction', 'repository_artifact', 'research', 'outcome',
  'analytics_support', 'live_observation', 'design_review', 'heuristic',
]);
const STRENGTHS = new Set(['primary', 'supporting', 'hypothesis']);
const REFERENCE_KINDS = new Set(['file', 'url', 'artifact', 'observation', 'external']);
const WORK_KINDS = new Set(['refinement', 'extension', 'new_surface', 'visual_replacement']);
const MODES = new Set(['persuade', 'operate', 'read', 'experience']);
const LIFECYCLES = new Set(['established', 'provisional', 'experimental', 'retired']);
const DOMAINS = new Set([
  'user_job', 'product_truth', 'ethical_boundary', 'protected_behavior', 'identity',
  'visual_language', 'voice_content', 'interaction', 'motion', 'platform',
  'outcome', 'countermetric',
]);
const RESOLUTIONS = new Set(['not_applicable', 'preserve', 'create', 'amend']);
const HASH = /^[a-f0-9]{64}$/u;

function fail(path, message) {
  throw new Error(`${path}: ${message}`);
}

function object(value, path) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) fail(path, 'expected object');
  return value;
}

function exact(value, fields, path) {
  const unknown = Object.keys(value).filter((field) => !fields.includes(field));
  if (unknown.length) fail(path, `unknown field(s): ${unknown.join(', ')}`);
  for (const field of fields) if (!(field in value)) fail(`${path}.${field}`, 'required');
}

function text(value, path) {
  if (typeof value !== 'string' || !value.trim()) fail(path, 'expected non-empty string');
  return value;
}

function oneOf(value, choices, path) {
  if (!choices.has(value)) fail(path, `unexpected value ${JSON.stringify(value)}`);
  return value;
}

function array(value, path, parse, minimum = 0) {
  if (!Array.isArray(value) || value.length < minimum) fail(path, `expected array with at least ${minimum} item(s)`);
  return value.map((item, index) => parse(item, `${path}[${index}]`));
}

function strings(value, path) {
  return array(value, path, text);
}

function reference(value, path) {
  const input = object(value, path);
  exact(input, ['kind', 'ref_id', 'path', 'sha256'], path);
  oneOf(input.kind, REFERENCE_KINDS, `${path}.kind`);
  text(input.ref_id, `${path}.ref_id`);
  if (input.path !== null) text(input.path, `${path}.path`);
  if (typeof input.sha256 !== 'string' || !HASH.test(input.sha256)) fail(`${path}.sha256`, 'expected SHA-256');
}

function evidence(value, path) {
  const input = object(value, path);
  exact(input, [
    'schema_version', 'evidence_id', 'source_class', 'strength', 'claim', 'summary',
    'observed_at', 'surface_ids', 'clause_ids', 'references',
  ], path);
  if (input.schema_version !== 'design_evidence.v1') fail(`${path}.schema_version`, 'expected design_evidence.v1');
  text(input.evidence_id, `${path}.evidence_id`);
  oneOf(input.source_class, SOURCE_CLASSES, `${path}.source_class`);
  oneOf(input.strength, STRENGTHS, `${path}.strength`);
  text(input.claim, `${path}.claim`);
  text(input.summary, `${path}.summary`);
  if (typeof input.observed_at !== 'string' || Number.isNaN(Date.parse(input.observed_at))) fail(`${path}.observed_at`, 'expected timestamp');
  strings(input.surface_ids, `${path}.surface_ids`);
  strings(input.clause_ids, `${path}.clause_ids`);
  array(input.references, `${path}.references`, reference, 1);
  return input;
}

const isStrong = (item) =>
  item.strength === 'primary' && item.source_class !== 'heuristic' && item.source_class !== 'design_review';
const isStrongForClause = (item, clauseId) =>
  isStrong(item) && item.clause_ids.includes(clauseId);

function verification(value, path) {
  const input = object(value, path);
  exact(input, ['method', 'description', 'proof'], path);
  oneOf(input.method, new Set(['mechanical', 'visual_judgment', 'outcome', 'external_authority']), `${path}.method`);
  text(input.description, `${path}.description`);
  strings(input.proof, `${path}.proof`);
}

function surface(value, path) {
  const input = object(value, path);
  exact(input, [
    'surface_id', 'user', 'job', 'context', 'mode', 'platform', 'frequency', 'risk',
    'density', 'content_ranges', 'important_states', 'protected_behaviors',
  ], path);
  for (const field of ['surface_id', 'user', 'job', 'context', 'platform']) text(input[field], `${path}.${field}`);
  oneOf(input.mode, MODES, `${path}.mode`);
  oneOf(input.frequency, new Set(['rare', 'occasional', 'frequent']), `${path}.frequency`);
  oneOf(input.risk, new Set(['low', 'standard', 'high']), `${path}.risk`);
  oneOf(input.density, new Set(['sparse', 'balanced', 'dense']), `${path}.density`);
  for (const field of ['content_ranges', 'important_states', 'protected_behaviors']) strings(input[field], `${path}.${field}`);
  return input;
}

function clause(value, path) {
  const input = object(value, path);
  exact(input, [
    'clause_id', 'domain', 'lifecycle', 'statement', 'rationale', 'surface_ids',
    'confidence', 'evidence', 'verification', 'revisit_triggers',
  ], path);
  text(input.clause_id, `${path}.clause_id`);
  if (input.clause_id.startsWith('floor.')) fail(`${path}.clause_id`, 'product clauses cannot amend the universal floor');
  oneOf(input.domain, DOMAINS, `${path}.domain`);
  oneOf(input.lifecycle, LIFECYCLES, `${path}.lifecycle`);
  text(input.statement, `${path}.statement`);
  text(input.rationale, `${path}.rationale`);
  strings(input.surface_ids, `${path}.surface_ids`);
  if (typeof input.confidence !== 'number' || input.confidence < 0 || input.confidence > 1) fail(`${path}.confidence`, 'expected number from 0 to 1');
  const evidenceItems = array(input.evidence, `${path}.evidence`, evidence);
  if (input.lifecycle === 'established' && !evidenceItems.some((item) => isStrongForClause(item, input.clause_id))) {
    fail(`${path}.evidence`, `established clause ${input.clause_id} requires clause-specific strong primary evidence`);
  }
  verification(input.verification, `${path}.verification`);
  strings(input.revisit_triggers, `${path}.revisit_triggers`);
  return input;
}

function changeSet(value, path) {
  const input = object(value, path);
  exact(input, [
    'operations', 'reason', 'affected_surface_ids', 'expected_consequence',
    'evidence', 'verification', 'rollback_revision_id',
  ], path);
  const operations = array(input.operations, `${path}.operations`, (value, operationPath) => {
    const operation = object(value, operationPath);
    exact(operation, ['operation', 'clause_id', 'replaces_clause_id'], operationPath);
    oneOf(operation.operation, new Set(['add', 'replace', 'retire']), `${operationPath}.operation`);
    text(operation.clause_id, `${operationPath}.clause_id`);
    if (operation.clause_id.startsWith('floor.') || String(operation.replaces_clause_id ?? '').startsWith('floor.')) fail(operationPath, 'cannot amend universal floor');
    if (operation.replaces_clause_id !== null) text(operation.replaces_clause_id, `${operationPath}.replaces_clause_id`);
    if (operation.operation === 'add' && operation.replaces_clause_id !== null) fail(`${operationPath}.replaces_clause_id`, 'add operations cannot replace a clause');
    if (operation.operation === 'replace' && operation.replaces_clause_id !== operation.clause_id) fail(`${operationPath}.replaces_clause_id`, 'replace operations must preserve and replace the same stable clause id');
    if (operation.operation === 'retire' && operation.replaces_clause_id !== null) fail(`${operationPath}.replaces_clause_id`, 'retire operations do not replace a clause');
    return operation;
  }, 1);
  text(input.reason, `${path}.reason`);
  strings(input.affected_surface_ids, `${path}.affected_surface_ids`);
  text(input.expected_consequence, `${path}.expected_consequence`);
  const evidenceItems = array(input.evidence, `${path}.evidence`, evidence);
  for (const operation of operations) {
    if (operation.operation !== 'add' && !evidenceItems.some((item) => isStrongForClause(item, operation.clause_id))) {
      fail(`${path}.evidence`, `${operation.operation} operation for ${operation.clause_id} requires clause-specific strong primary evidence`);
    }
  }
  verification(input.verification, `${path}.verification`);
  if (input.rollback_revision_id !== null) text(input.rollback_revision_id, `${path}.rollback_revision_id`);
  return input;
}

function proposal(value, path) {
  const input = object(value, path);
  exact(input, ['work_kind', 'maturity', 'surfaces', 'clauses', 'unknowns', 'change_set'], path);
  oneOf(input.work_kind, WORK_KINDS, `${path}.work_kind`);
  oneOf(input.maturity, new Set(['emerging', 'maturing', 'mature']), `${path}.maturity`);
  const surfaces = array(input.surfaces, `${path}.surfaces`, surface, 1);
  const clauses = array(input.clauses, `${path}.clauses`, clause, 1);
  const surfaceIds = new Set(surfaces.map((item) => item.surface_id));
  if (surfaceIds.size !== surfaces.length) fail(`${path}.surfaces`, 'duplicate surface_id');
  if (new Set(clauses.map((item) => item.clause_id)).size !== clauses.length) fail(`${path}.clauses`, 'duplicate clause_id');
  const clauseIds = new Set(clauses.map((item) => item.clause_id));
  for (const item of clauses) for (const id of item.surface_ids) if (!surfaceIds.has(id)) fail(`${path}.clauses`, `unknown surface ${id}`);
  strings(input.unknowns, `${path}.unknowns`);
  const parsedChangeSet = changeSet(input.change_set, `${path}.change_set`);
  const operationIds = parsedChangeSet.operations.map((item) => item.clause_id);
  if (new Set(operationIds).size !== operationIds.length) fail(`${path}.change_set.operations`, 'duplicate clause operation');
  for (const id of parsedChangeSet.affected_surface_ids) if (!surfaceIds.has(id)) fail(`${path}.change_set.affected_surface_ids`, `unknown surface ${id}`);
  for (const operation of parsedChangeSet.operations) {
    if (!clauseIds.has(operation.clause_id)) fail(`${path}.change_set.operations`, `unknown clause ${operation.clause_id}`);
    if (operation.operation === 'retire' && clauses.find((item) => item.clause_id === operation.clause_id)?.lifecycle !== 'retired') {
      fail(`${path}.change_set.operations`, `retire operation for ${operation.clause_id} must leave the clause retired in the snapshot`);
    }
  }
  const embeddedEvidence = [
    ...clauses.flatMap((item) => item.evidence),
    ...parsedChangeSet.evidence,
  ];
  for (const item of embeddedEvidence) {
    for (const id of item.surface_ids) if (!surfaceIds.has(id)) fail(`${path}.evidence`, `evidence ${item.evidence_id} references unknown surface ${id}`);
    for (const id of item.clause_ids) if (!clauseIds.has(id)) fail(`${path}.evidence`, `evidence ${item.evidence_id} references unknown clause ${id}`);
  }
  return input;
}

export function validateDesignResolution(value) {
  const input = object(value, 'design_resolution');
  exact(input, ['schema_version', 'resolution', 'rationale', 'evidence', 'expected_base', 'proposal'], 'design_resolution');
  if (input.schema_version !== 'design_resolution.v1') fail('design_resolution.schema_version', 'expected design_resolution.v1');
  oneOf(input.resolution, RESOLUTIONS, 'design_resolution.resolution');
  text(input.rationale, 'design_resolution.rationale');
  const evidenceItems = array(input.evidence, 'design_resolution.evidence', evidence);
  if (input.expected_base !== null) {
    const base = object(input.expected_base, 'design_resolution.expected_base');
    exact(base, ['revision_id', 'subject_sha256'], 'design_resolution.expected_base');
    text(base.revision_id, 'design_resolution.expected_base.revision_id');
    if (typeof base.subject_sha256 !== 'string' || !HASH.test(base.subject_sha256)) fail('design_resolution.expected_base.subject_sha256', 'expected SHA-256');
  }
  if (input.proposal !== null) proposal(input.proposal, 'design_resolution.proposal');
  if (input.resolution === 'create' && input.expected_base !== null) fail('design_resolution.expected_base', 'create must not have a base');
  if (input.resolution === 'amend' && input.expected_base === null) fail('design_resolution.expected_base', 'amend requires a base');
  const mutates = input.resolution === 'create' || input.resolution === 'amend';
  if (mutates !== (input.proposal !== null)) fail('design_resolution.proposal', 'only create/amend carry proposals');
  if (input.resolution === 'create' && input.proposal.change_set.rollback_revision_id !== null) {
    fail('design_resolution.proposal.change_set.rollback_revision_id', 'create cannot name a rollback revision');
  }
  if (input.resolution === 'amend') {
    if (input.proposal.change_set.rollback_revision_id !== input.expected_base.revision_id) {
      fail('design_resolution.proposal.change_set.rollback_revision_id', 'amend rollback revision must equal the expected base revision');
    }
    for (const operation of input.proposal.change_set.operations) {
      if (operation.operation !== 'add' && !evidenceItems.some((item) => isStrongForClause(item, operation.clause_id))) {
        fail('design_resolution.evidence', `amend resolution lacks clause-specific strong evidence for ${operation.clause_id}`);
      }
    }
  }
  return input;
}

function main() {
  const path = process.argv[2];
  if (path === '--help' || path === '-h') {
    console.log(USAGE);
    return;
  }
  if (!path) {
    console.error(USAGE);
    process.exit(2);
  }
  try {
    validateDesignResolution(JSON.parse(readFileSync(path, 'utf8')));
    console.log(`PASS ${path} conforms to design_resolution.v1`);
  } catch (error) {
    console.error(`FAIL ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

if (
  process.argv[1] &&
  realpathSync(fileURLToPath(import.meta.url)) === realpathSync(resolve(process.argv[1]))
) main();
