#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptDir, "..", "..");
const criterion = readCriterion(process.argv.slice(2));

execFileSync("npm", ["run", "--silent", "build"], {
  cwd: repoRoot,
  stdio: "inherit"
});

const schemas = await import(pathToFileURL(join(repoRoot, "dist", "schema", "index.js")).href);

const digest = (seed) => `sha256:${seed.repeat(64).slice(0, 64)}`;
const now = "2026-09-09T12:00:00Z";
const later = "2026-09-10T12:00:00Z";
const latest = "2026-09-11T12:00:00Z";

function readCriterion(args) {
  const index = args.indexOf("--criterion");
  if (index === -1 || args[index + 1] === undefined) {
    throw new Error("Usage: node scripts/verify/shared-schemas.mjs --criterion strict-rejections|candidate-identity");
  }
  return args[index + 1];
}

function assertRejects(fn, pattern) {
  assert.throws(
    fn,
    (error) => {
      assert(error instanceof schemas.SharedSchemaValidationError, "expected SharedSchemaValidationError");
      const issueText = error.issues.map((issue) => `${issue.code}:${issue.message}`).join("\n");
      assert.match(issueText, pattern);
      return true;
    }
  );
}

function registryFixture() {
  return {
    schema_version: "model_registry.v1",
    registry_id: "registry:v1",
    content_digest: digest("a"),
    retrieved_at: now,
    records: [
      {
        schema_version: "model_record.v1",
        record_id: "model:synthetic_fable_51",
        provider: "synthetic",
        model_id: "claude-fable-5-1",
        snapshot_id: "claude-fable-5-1",
        family: "claude_fable",
        capabilities: ["terminal"],
        frontier: null,
        lifecycle: "available",
        content_digest: digest("a"),
        aliases: ["fable", "latest", "recommended"],
        supported_efforts: ["high", "xhigh"],
        supported_serving_settings: {
          fallback: ["disabled", "enabled"],
          tool_use: ["none", "host_tools"],
          json_schema: [false, true]
        },
        material_serving_settings: ["fallback", "tool_use", "json_schema"],
        context_window_tokens: 200000,
        pinning: {
          verified: true,
          immutable_snapshot: true,
          source: "synthetic_fixture",
          retrieved_at: now,
          evidence_digest: digest("b")
        }
      }
    ]
  };
}

function candidateFixture(overrides = {}) {
  return {
    schema_version: "candidate.v1",
    candidate_id: "candidate:fable_xhigh_no_fallback",
    provider: "synthetic",
    model_id: "claude-fable-5-1",
    snapshot_id: "claude-fable-5-1",
    effort: "xhigh",
    serving: {
      fallback: "disabled",
      tool_use: "host_tools",
      json_schema: true
    },
    material_serving_settings: ["fallback", "tool_use", "json_schema"],
    provenance: {
      registry_id: "registry:v1",
      model_record_id: "model:synthetic_fable_51",
      registry_content_digest: digest("a")
    },
    ...overrides
  };
}

function evidenceFixture(overrides = {}) {
  return {
    schema_version: "evidence_record.v1",
    evidence_id: "evidence:own_eval_1",
    content_digest: digest("a"),
    observation_refs: [],
    evidence_type: "own_eval",
    lane: "synthetic_policy_test",
    candidate: {
      candidate_id: "candidate:fable_xhigh_no_fallback",
      candidate_identity: schemas.candidateIdentity(candidateFixture())
    },
    suite_id: "suite:bounded_backend",
    suite_version: 1,
    dataset_version: "fixtures-1",
    methodology_version: "method-1",
    harness_version: "harness-1",
    grader_version: "grader-1",
    measured_at: now,
    retrieved_at: later,
    attempted: 10,
    passed: 9,
    accepted: 8,
    total_cost_usd: 1.25,
    median_latency_ms: 1000,
    source_digest: digest("c"),
    ...overrides
  };
}

function decisionFixture(overrides = {}) {
  return {
    schema_version: "decision_record.v1",
    decision_id: "decision:initial",
    policy_version: 1,
    policy_digest: digest("d"),
    candidate_set_digest: digest("e"),
    evidence_digest: digest("f"),
    outcome: "SELECT",
    selected_candidate_id: "candidate:fable_xhigh_no_fallback",
    considered_candidate_ids: ["candidate:fable_xhigh_no_fallback"],
    evidence_refs: ["evidence:own_eval_1"],
    rule_ids: ["model_must_be_available", "cheapest_qualified_candidate"],
    created_at: now,
    ...overrides
  };
}

function bindingFixture(overrides = {}) {
  return {
    schema_version: "binding.v1",
    binding_id: "binding:implementer_backend",
    mode: "simulation",
    policy_version: 1,
    policy_digest: digest("d"),
    schema_digest: digest("9"),
    generated_at: now,
    refresh_due_at: later,
    hard_expiry_at: latest,
    role_id: "role:implementer",
    task_class_id: "task:bounded_backend",
    risk: "medium",
    candidate: candidateFixture(),
    decision: decisionFixture(),
    evidence_refs: ["evidence:own_eval_1"],
    candidate_set_digest: digest("e"),
    evidence_digest: digest("f"),
    production_synthetic_evidence: false,
    ...overrides
  };
}

function verifySchemaArtifact() {
  const schemaPath = join(repoRoot, "schemas", "model-governor.shared.schema.json");
  assert.equal(existsSync(schemaPath), true, "public shared schema artifact must exist");
  const artifact = JSON.parse(readFileSync(schemaPath, "utf8"));
  assert.equal(artifact.schema_version, schemas.sharedSchemaVersion);
  assert.deepEqual(artifact, schemas.sharedJsonSchema(), "public artifact must match its generated runtime structural projection");
}

function verifyStrictRejections() {
  verifySchemaArtifact();
  assertRejects(
    () => schemas.parseRole({
      schema_version: "role.v1",
      role_id: "role:implementer",
      version: 1,
      title: "Implementer",
      allowed_task_class_ids: ["task:bounded_backend"],
      max_risk: "medium",
      extra: true
    }),
    /unrecognized|unknown/i
  );
  assertRejects(() => schemas.parseEvidenceRecord({ ...evidenceFixture(), confidence: 0.8 }), /FORBIDDEN_SYNTHETIC_SCALAR/);
  assertRejects(() => schemas.parseDecisionRecord({ ...decisionFixture(), quality_score: 0.9 }), /FORBIDDEN_SYNTHETIC_SCALAR/);
  assertRejects(() => schemas.parseEvidenceRecord({ ...evidenceFixture(), passed: 11 }), /IMPOSSIBLE_COUNT/);
  assertRejects(() => schemas.parseEvidenceRecord({ ...evidenceFixture(), attempted: -1 }), /too_small|greater than/i);
  assertRejects(() => schemas.parseEvidenceRecord({ ...evidenceFixture(), total_cost_usd: Number.POSITIVE_INFINITY }), /finite|expected number/i);
  assertRejects(() => schemas.parseEvidenceRecord({ ...evidenceFixture(), measured_at: later, retrieved_at: now }), /INVALID_CHRONOLOGY/);
  assertRejects(() => schemas.parseBinding(bindingFixture({ refresh_due_at: latest, hard_expiry_at: later })), /INVALID_CHRONOLOGY/);
  assertRejects(
    () => schemas.parseModelRegistry({ ...registryFixture(), records: [registryFixture().records[0], registryFixture().records[0]] }),
    /DUPLICATE/
  );
  assertRejects(
    () => schemas.validateCandidateAgainstRegistry(candidateFixture({ effort: "max" }), registryFixture()),
    /UNSUPPORTED_EFFORT/
  );
  assertRejects(
    () => schemas.validateCandidateAgainstRegistry(candidateFixture({ provenance: { ...candidateFixture().provenance, registry_content_digest: digest("0") } }), registryFixture()),
    /REGISTRY_DIGEST_MISMATCH/
  );
}

function verifyCandidateIdentity() {
  verifySchemaArtifact();
  const registry = registryFixture();
  const xhighNoFallback = candidateFixture();
  const highNoFallback = candidateFixture({
    candidate_id: "candidate:fable_high_no_fallback",
    effort: "high"
  });
  const xhighFallback = candidateFixture({
    candidate_id: "candidate:fable_xhigh_fallback",
    serving: { fallback: "enabled", tool_use: "host_tools", json_schema: true }
  });
  const candidates = schemas.validateCandidateSetAgainstRegistry([xhighNoFallback, highNoFallback, xhighFallback], registry);
  assert.equal(new Set(candidates.map(schemas.candidateIdentity)).size, 3);
  assert.notEqual(schemas.candidateIdentity(xhighNoFallback), schemas.candidateIdentity(highNoFallback));
  assert.notEqual(schemas.candidateIdentity(xhighNoFallback), schemas.candidateIdentity(xhighFallback));
  assertRejects(
    () => schemas.validateCandidateAgainstRegistry(candidateFixture({ model_id: "latest", snapshot_id: "latest" }), registry),
    /MODEL_ALIAS_REJECTED|PINNED_MODEL_ID_REQUIRED/
  );
  assertRejects(
    () => schemas.validateCandidateAgainstRegistry(candidateFixture({ serving: { fallback: "disabled", tool_use: "provider_tools", json_schema: true } }), registry),
    /UNSUPPORTED_SERVING_CONFIGURATION/
  );
  assertRejects(
    () => schemas.validateCandidateSetAgainstRegistry([xhighNoFallback, candidateFixture({ candidate_id: "candidate:same_treatment" })], registry),
    /DUPLICATE_IDENTITY/
  );
  const missingProvenance = { ...candidateFixture() };
  delete missingProvenance.provenance;
  assertRejects(() => schemas.validateCandidateAgainstRegistry(missingProvenance, registry), /expected object|provenance|required/i);
}

if (criterion === "strict-rejections") {
  verifyStrictRejections();
} else if (criterion === "candidate-identity") {
  verifyCandidateIdentity();
} else {
  throw new Error(`Unknown criterion: ${criterion}`);
}

console.log(JSON.stringify({ ok: true, criterion }));
