import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  SharedSchemaValidationError,
  candidateIdentity,
  parseBinding,
  parseDecisionRecord,
  parseEvidenceLedger,
  sharedJsonSchema,
  parseEvidenceRecord,
  parseModelRegistry,
  parseProofReport,
  parseRole,
  parseRuntimeReport,
  validateCandidateAgainstRegistry,
  validateCandidateSetAgainstRegistry,
  type Candidate,
  type DecisionRecord,
  type ModelRegistry
} from "../../src/schema/index.js";

const digest = (seed: string) => `sha256:${seed.repeat(64).slice(0, 64)}`;
const now = "2026-09-09T12:00:00Z";
const later = "2026-09-10T12:00:00Z";
const latest = "2026-09-11T12:00:00Z";

function expectSchemaRejects(input: () => unknown, expectedCodeOrMessage: RegExp): void {
  expect(input).toThrow(SharedSchemaValidationError);
  try {
    input();
  } catch (error) {
    expect(error).toBeInstanceOf(SharedSchemaValidationError);
    const issues = (error as SharedSchemaValidationError).issues;
    expect(issues.map((issue) => `${issue.code}:${issue.message}`).join("\n")).toMatch(expectedCodeOrMessage);
  }
}

function registryFixture(): ModelRegistry {
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

function candidateFixture(overrides: Partial<Candidate> = {}): Candidate {
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

function ownEvalEvidenceFixture(overrides: Record<string, unknown> = {}) {
  return {
    schema_version: "evidence_record.v1",
    evidence_id: "evidence:own_eval_1",
    content_digest: digest("a"),
    observation_refs: [],
    evidence_type: "own_eval",
    lane: "synthetic_policy_test",
    candidate: {
      candidate_id: "candidate:fable_xhigh_no_fallback",
      candidate_identity: candidateIdentity(candidateFixture())
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

function decisionFixture(): DecisionRecord {
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
    created_at: now
  };
}

function bindingFixture(overrides: Record<string, unknown> = {}) {
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

describe("shared strict schemas", () => {
  it("accepts valid candidate treatments and gives each effort/serving treatment a distinct identity", () => {
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

    const candidates = validateCandidateSetAgainstRegistry([xhighNoFallback, highNoFallback, xhighFallback], registry);
    expect(new Set(candidates.map(candidateIdentity)).size).toBe(3);
  });

  it("rejects alias candidates even when the alias is listed in registry metadata", () => {
    expectSchemaRejects(
      () => validateCandidateAgainstRegistry(candidateFixture({ model_id: "fable", snapshot_id: "fable" }), registryFixture()),
      /MODEL_ALIAS_REJECTED|PINNED_MODEL_ID_REQUIRED/
    );
  });

  it("rejects unsupported effort and material serving configurations", () => {
    expectSchemaRejects(
      () => validateCandidateAgainstRegistry(candidateFixture({ effort: "max" }), registryFixture()),
      /UNSUPPORTED_EFFORT/
    );
    expectSchemaRejects(
      () =>
        validateCandidateAgainstRegistry(
          candidateFixture({ serving: { fallback: "disabled", tool_use: "provider_tools", json_schema: true } }),
          registryFixture()
        ),
      /UNSUPPORTED_SERVING_CONFIGURATION/
    );
  });

  it("rejects candidates missing provenance or pinning not verified against registry metadata", () => {
    const candidateWithoutProvenance = { ...candidateFixture() };
    delete (candidateWithoutProvenance as Partial<Candidate>).provenance;
    expectSchemaRejects(() => validateCandidateAgainstRegistry(candidateWithoutProvenance, registryFixture()), /expected object|provenance|required/i);

    expectSchemaRejects(
      () =>
        validateCandidateAgainstRegistry(
          candidateFixture({ provenance: { ...candidateFixture().provenance, registry_content_digest: digest("0") } }),
          registryFixture()
        ),
      /REGISTRY_DIGEST_MISMATCH/
    );
  });

  it("rejects duplicate registry and candidate identities", () => {
    expectSchemaRejects(
      () => parseModelRegistry({ ...registryFixture(), records: [registryFixture().records[0], registryFixture().records[0]] }),
      /DUPLICATE/
    );
    expectSchemaRejects(
      () =>
        validateCandidateSetAgainstRegistry(
          [
            candidateFixture(),
            candidateFixture({ candidate_id: "candidate:fable_duplicate_treatment" })
          ],
          registryFixture()
        ),
      /DUPLICATE_IDENTITY/
    );
  });

  it("rejects unknown fields and invented scalar confidence or quality fields", () => {
    expectSchemaRejects(
      () => parseRole({
        schema_version: "role.v1",
        role_id: "role:implementer",
        version: 1,
        title: "Implementer",
        allowed_task_class_ids: ["task:bounded_backend"],
        max_risk: "medium",
        surprise: true
      }),
      /unrecognized|unknown/i
    );
    expectSchemaRejects(
      () => parseDecisionRecord({ ...decisionFixture(), confidence: 0.91 }),
      /FORBIDDEN_SYNTHETIC_SCALAR/
    );
    expectSchemaRejects(
      () => parseEvidenceRecord({ ...ownEvalEvidenceFixture(), quality: 0.97 }),
      /FORBIDDEN_SYNTHETIC_SCALAR/
    );
  });

  it("rejects impossible counts and nonfinite values", () => {
    expectSchemaRejects(() => parseEvidenceRecord({ ...ownEvalEvidenceFixture(), passed: 11 }), /IMPOSSIBLE_COUNT/);
    expectSchemaRejects(() => parseEvidenceRecord({ ...ownEvalEvidenceFixture(), attempted: -1 }), /too_small|greater than/i);
    expectSchemaRejects(() => parseEvidenceRecord({ ...ownEvalEvidenceFixture(), total_cost_usd: Number.POSITIVE_INFINITY }), /finite|expected number/i);
    expectSchemaRejects(() => parseEvidenceRecord({ ...ownEvalEvidenceFixture(), median_latency_ms: Number.NaN }), /finite|number/i);
  });

  it("rejects invalid chronology across public records", () => {
    expectSchemaRejects(() => parseEvidenceRecord({ ...ownEvalEvidenceFixture(), measured_at: later, retrieved_at: now }), /INVALID_CHRONOLOGY/);
    expectSchemaRejects(() => parseBinding(bindingFixture({ refresh_due_at: latest, hard_expiry_at: later })), /INVALID_CHRONOLOGY/);

    const runtimeReport = {
      schema_version: "runtime_report.v1",
      report_id: "runtime:one",
      provider: "synthetic",
      candidate_id: "candidate:fable_xhigh_no_fallback",
      started_at: later,
      completed_at: now,
      command: { executable: "node", args: ["--version"], cwd: "/tmp" },
      status: "completed",
      exit_code: 0,
      signal: null,
      timeout_ms: 1000,
      stdout_digest: digest("7"),
      observed_identity: { source: "unknown" }
    };
    expectSchemaRejects(() => parseRuntimeReport(runtimeReport), /INVALID_CHRONOLOGY/);
  });

  it("rejects duplicate IDs in ledgers and proof reports", () => {
    const ledger = {
      schema_version: "evidence_ledger.v1",
      ledger_id: "ledger:evidence",
      content_digest: digest("a"),
      created_at: now,
      records: [ownEvalEvidenceFixture(), ownEvalEvidenceFixture()]
    };
    expectSchemaRejects(() => parseEvidenceLedger(ledger), /DUPLICATE/);

    const proof = {
      schema_version: "proof_report.v1",
      proof_report_id: "proof:one",
      generated_at: now,
      artifact_digests: [digest("1"), digest("1")],
      checks: [
        {
          check_id: "check:test",
          command: "npm test",
          started_at: now,
          completed_at: later,
          status: "passed",
          stdout_digest: digest("2")
        }
      ]
    };
    expectSchemaRejects(() => parseProofReport(proof), /DUPLICATE_DIGEST/);
  });
});

describe("shared schema regression cases", () => {
  it.each(["2026-02-30T00:00:00Z", "2026-02-29T00:00:00Z", "2026-04-31T12:00:00+02:00"])(
    "rejects nonexistent calendar dates: %s",
    (retrieved_at) => expect(() => parseModelRegistry({ ...registryFixture(), retrieved_at })).toThrow(SharedSchemaValidationError)
  );

  it.each(["2024-02-29T00:00:00Z", "2026-09-09T12:00:00.123456789+02:00"])(
    "preserves valid leap dates and offset/fraction timestamps: %s",
    (retrieved_at) => expect(parseModelRegistry({ ...registryFixture(), retrieved_at }).retrieved_at).toBe(retrieved_at)
  );

  it("does not split one treatment by settings the registry does not declare material", () => {
    const registry = registryFixture();
    registry.records[0]!.material_serving_settings = ["fallback"];
    const first = candidateFixture({ material_serving_settings: ["fallback"] });
    const second = candidateFixture({
      candidate_id: "candidate:nonmaterial_variant",
      material_serving_settings: ["fallback"],
      serving: { ...first.serving, tool_use: "none", json_schema: false }
    });
    expect(candidateIdentity(validateCandidateAgainstRegistry(first, registry)))
      .toBe(candidateIdentity(validateCandidateAgainstRegistry(second, registry)));
    expectSchemaRejects(() => validateCandidateSetAgainstRegistry([first, second], registry), /DUPLICATE_IDENTITY/);
    const changedMaterial = candidateFixture({
      candidate_id: "candidate:material_variant", material_serving_settings: ["fallback"],
      serving: { ...first.serving, fallback: "enabled" }
    });
    expect(candidateIdentity(validateCandidateAgainstRegistry(changedMaterial, registry)))
      .not.toBe(candidateIdentity(first));
  });

  it("canonicalizes material setting declaration order without changing identity", () => {
    const first = candidateFixture();
    const second = candidateFixture({ material_serving_settings: [...first.material_serving_settings].reverse() });
    expect(candidateIdentity(first)).toBe(candidateIdentity(second));
  });
});


it("keeps the checked-in structural JSON schema generated from the runtime source", () => {
  const artifact = JSON.parse(readFileSync(new URL("../../schemas/model-governor.shared.schema.json", import.meta.url), "utf8"));
  expect(artifact).toEqual(sharedJsonSchema());
});

it("represents zero observations and no-candidate HOLD without inventing a selection", () => {
  expect(parseEvidenceRecord({ ...ownEvalEvidenceFixture(), attempted: 0, passed: 0, accepted: 0, total_cost_usd: 0 })).toMatchObject({ attempted: 0 });
  const decision = { ...decisionFixture(), outcome: "HOLD", considered_candidate_ids: [] };
  delete (decision as { selected_candidate_id?: string }).selected_candidate_id;
  expect(parseDecisionRecord(decision).outcome).toBe("HOLD");
});

it("rejects internally inconsistent binding decisions before independent policy validation", () => {
  const binding = bindingFixture();
  binding.decision.policy_digest = digest("0");
  expectSchemaRejects(() => parseBinding(binding), /BINDING_DECISION_MISMATCH/);
});
