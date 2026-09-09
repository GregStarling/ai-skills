import { describe, expect, it } from "vitest";
import { canonicalJson, contentDigest, digest, hashBytes } from "../../src/core/canonical.js";
import { bindCandidate, validateRegistry } from "../../src/registry/index.js";
import { summarizeObservations, validateEvidenceLedger, validateObservation, validateObservations } from "../../src/evidence/index.js";
import { candidateIdentity, parseCandidate, parseModelRegistry, parseTaskObservation, type TaskObservation } from "../../src/schema/index.js";

const stub = `sha256:${"0".repeat(64)}`;
const time = "2026-09-09T00:00:00Z";
const bytes = { fixture: "real task fixture snapshot", source: "raw execution/grader source", artifact: "returned artifact", stdout: "PASS", stderr: "" };
const sources = new Map(Object.values(bytes).map((value) => [hashBytes(value), value]));

function registry(production = false) {
  const value = parseModelRegistry({
    schema_version: "model_registry.v1", registry_id: "registry_one", content_digest: stub, retrieved_at: time,
    records: [{ schema_version: "model_record.v1", record_id: "record_one", provider: production ? "openai" : "synthetic",
      model_id: "example-release", snapshot_id: "example-release", family: "family_one", capabilities: ["terminal"], frontier: null,
      lifecycle: "available", content_digest: stub, aliases: ["latest"], supported_efforts: ["medium"],
      supported_serving_settings: { fallback: ["disabled"], tool_use: ["host_tools"], json_schema: [false] },
      material_serving_settings: ["fallback"], context_window_tokens: null,
      pinning: { verified: true, immutable_snapshot: true, source: production ? "official_metadata" : "synthetic_fixture", retrieved_at: time, evidence_digest: hashBytes(bytes.source) }
    }]
  });
  value.records[0]!.content_digest = contentDigest(value.records[0]!);
  value.content_digest = contentDigest(value);
  return value;
}
function candidate(production = false) {
  const record = registry(production);
  return parseCandidate({ schema_version: "candidate.v1", candidate_id: "candidate_one", provider: production ? "openai" : "synthetic", model_id: "example-release", snapshot_id: "example-release", effort: "medium", serving: { fallback: "disabled", tool_use: "host_tools", json_schema: false }, material_serving_settings: ["fallback"], provenance: { registry_id: record.registry_id, model_record_id: "record_one", registry_content_digest: record.content_digest } });
}
function receipt() {
  return { schema_version: "runtime_report.v1", report_id: "runtime_one", provider: "openai", candidate_id: "candidate_one", started_at: time, completed_at: time, command: { executable: "codex", args: ["exec"], cwd: "/tmp/fixture" }, status: "completed", exit_code: 0, signal: null, timeout_ms: 1000, stdout_digest: hashBytes(bytes.stdout), stderr_digest: hashBytes(bytes.stderr), observed_identity: { source: "unknown" } };
}
function observation(id = "observation_one", production = false): TaskObservation {
  const value = parseTaskObservation({ schema_version: "task_observation.v1", observation_id: id, content_digest: stub,
    lane: production ? "production" : "synthetic_policy_test", candidate: { candidate_id: "candidate_one", candidate_identity: candidateIdentity(candidate(production)) },
    task_id: `task_${id}`, fixture_digest: hashBytes(bytes.fixture), cohort_id: "cohort_one", role_id: "implementer", task_class_id: "bounded_backend", risk: "low", constraints_digest: digest({}), suite_id: "suite_one", suite_version: 1, harness_version: "harness-v1", grader_version: "grader-v1", measured_at: time, passed: true, accepted: true, latency_ms: 900,
    attempts: [{ attempt_id: "worker_one", kind: "worker", cost_usd: 2, cost_source: "measured", latency_ms: 800 }, { attempt_id: "review_one", kind: "review", cost_usd: 1, cost_source: "measured", latency_ms: 500 }],
    provenance: { source: production ? "native_runtime" : "synthetic_fixture", source_digest: hashBytes(bytes.source), artifact_digest: hashBytes(bytes.artifact), runtime_receipt_digest: production ? digest(receipt()) : null }
  });
  if (production) {
    const grade = canonicalJson({ schema_version: "grader_result.v1", task_id: value.task_id, fixture_digest: value.fixture_digest, candidate_identity: value.candidate.candidate_identity, artifact_digest: value.provenance.artifact_digest, passed: value.passed, accepted: value.accepted, checks: [{ check_id: "check_one", passed: true, evidence_digest: hashBytes(bytes.stdout) }] });
    value.provenance.source_digest = hashBytes(grade); sources.set(hashBytes(grade), grade);
  }
  return seal(value);
}
function seal<T extends { content_digest: string }>(value: T): T { value.content_digest = contentDigest(value); return value; }
function options(production = false) { return { registry: registry(production), candidates: [candidate(production)], mode: production ? "production" as const : "simulation" as const, sources, runtimeReports: new Map([[digest(receipt()), receipt()]]) }; }
function ledger(raw: TaskObservation[]) {
  const summary = summarizeObservations(raw);
  const record = seal({ schema_version: "evidence_record.v1", evidence_id: "evidence_one", content_digest: stub, evidence_type: "own_eval", lane: "synthetic_policy_test", candidate: { candidate_id: "candidate_one", candidate_identity: candidateIdentity(candidate()) }, suite_id: "suite_one", suite_version: 1, dataset_version: "dataset-v1", methodology_version: "method-v1", harness_version: "harness-v1", grader_version: "grader-v1", measured_at: time, retrieved_at: time, observation_refs: raw.map((item) => item.observation_id), attempted: summary.attempted, passed: summary.passed, accepted: summary.accepted, total_cost_usd: summary.total_cost_usd, source_digest: hashBytes(bytes.source) });
  return seal({ schema_version: "evidence_ledger.v1", ledger_id: "ledger_one", content_digest: stub, created_at: time, records: [record] });
}

describe("canonical identity", () => {
  it("is stable across key order and distinguishes content and bytes", () => {
    expect(canonicalJson({ z: 1, a: { y: false, x: null } })).toBe('{"a":{"x":null,"y":false},"z":1}');
    expect(digest({ a: 1, b: 2 })).toBe(digest({ b: 2, a: 1 }));
    expect(hashBytes("abc")).toBe("sha256:ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(contentDigest({ a: 1, content_digest: "old" })).toBe(contentDigest({ content_digest: "new", a: 1 }));
  });
  it.each([undefined, NaN, Infinity, { unsupported: undefined }, new Date(), [undefined], Array(1)])("rejects non-JSON input %j instead of silently dropping it", (value) => expect(() => canonicalJson(value)).toThrow());
  it("rejects cycles while permitting repeated noncyclic values", () => { const value: Record<string, unknown> = {}; value["self"] = value; expect(() => digest(value)).toThrow(/CYCLIC/); const shared = { x: 1 }; expect(() => digest([shared, shared])).not.toThrow(); });
});

describe("registry and evidence integrity", () => {
  it("binds against actual registry and record hashes and preserves unknown metadata", () => {
    const valid = validateRegistry(registry());
    expect(bindCandidate(candidate(), valid).candidate_id).toBe("candidate_one");
    expect(valid.records[0]!.context_window_tokens).toBeNull();
    const altered = structuredClone(valid); altered.records[0]!.context_window_tokens = 1000000;
    expect(() => validateRegistry(altered)).toThrow();
    altered.records[0]!.content_digest = contentDigest(altered.records[0]!);
    expect(() => validateRegistry(altered)).toThrow();
    const wrong = candidate(); wrong.provenance.registry_content_digest = valid.records[0]!.content_digest;
    expect(() => bindCandidate(wrong, valid)).toThrow();
  });
  it("allows incomplete registry metadata but does not bind unverified snapshots", () => {
    const incomplete = registry(); incomplete.records[0]!.pinning = null; incomplete.records[0]!.family = null;
    seal(incomplete.records[0]!); seal(incomplete);
    expect(validateRegistry(incomplete).records[0]!.family).toBeNull();
    const target = candidate(); target.provenance.registry_content_digest = incomplete.content_digest;
    expect(() => bindCandidate(target, incomplete)).toThrow();
  });
  it("rejects tampered, missing, duplicate and cross-treatment observations", () => {
    const raw = observation(); expect(validateObservations([raw], options())).toHaveLength(1);
    expect(() => validateObservation({ ...raw, accepted: false })).toThrow();
    expect(() => validateObservations([raw], { ...options(), sources: new Map() })).toThrow();
    expect(() => validateObservations([raw, raw], options())).toThrow();
    const mismatch = seal({ ...raw, candidate: { ...raw.candidate, candidate_identity: stub } });
    expect(() => validateObservations([mismatch], options())).toThrow();
  });
  it("keeps synthetic data out of production even if the caller relabels a record", () => {
    expect(() => validateObservations([observation()], { ...options(), mode: "production" })).toThrow();
    expect(() => parseTaskObservation({ ...observation(), lane: "production" })).toThrow();
  });
  it("requires intact native receipts and captured streams for production lineage", () => {
    const raw = observation("real_observation", true);
    expect(validateObservations([raw], options(true))).toHaveLength(1);
    const forgedOutcome = seal({ ...raw, passed: false, accepted: false });
    expect(() => validateObservations([forgedOutcome], options(true))).toThrow();
    const missingGrader = new Map(sources); missingGrader.delete(raw.provenance.source_digest);
    expect(() => validateObservations([raw], { ...options(true), sources: missingGrader })).toThrow();
    expect(() => validateObservation(raw)).toThrow();
    expect(() => validateObservations([raw], { ...options(true), runtimeReports: new Map([[digest(receipt()), { ...receipt(), exit_code: 1 }]]) })).toThrow();
    const missing = new Map(sources); missing.delete(hashBytes(bytes.stdout));
    expect(() => validateObservations([raw], { ...options(true), sources: missing })).toThrow();
  });
  it("recomputes aggregates from every attempt including rejected work and unknown costs", () => {
    const accepted = observation();
    const rejected = observation("observation_two"); rejected.passed = false; rejected.accepted = false; rejected.attempts.push({ attempt_id: "rework_one", kind: "rework", cost_usd: 4, cost_source: "measured", latency_ms: 1 }); seal(rejected);
    expect(summarizeObservations([accepted, rejected])).toEqual({ attempted: 2, passed: 1, accepted: 1, total_cost_usd: 10, cost_per_accepted_task_usd: 10 });
    expect(validateEvidenceLedger(ledger([accepted, rejected]), sources, [accepted, rejected]).records).toHaveLength(1);
    const forged = ledger([accepted, rejected]); forged.records[0]!.total_cost_usd = 3; seal(forged.records[0]!); seal(forged);
    expect(() => validateEvidenceLedger(forged, sources, [accepted, rejected])).toThrow();
    rejected.attempts[0]!.cost_usd = null; rejected.attempts[0]!.cost_source = "unknown"; seal(rejected);
    expect(summarizeObservations([accepted, rejected]).cost_per_accepted_task_usd).toBeNull();
    expect(validateEvidenceLedger(ledger([accepted, rejected]), sources, [accepted, rejected]).records).toHaveLength(1);
    expect(summarizeObservations([])).toEqual({ attempted: 0, passed: 0, accepted: 0, total_cost_usd: 0, cost_per_accepted_task_usd: null });
    expect(validateEvidenceLedger(ledger([]), sources).records).toHaveLength(1);
  });
  it("rejects aggregates with missing raw evidence, mismatched strata or changed source bytes", () => {
    const raw = observation(); const value = ledger([raw]);
    expect(() => validateEvidenceLedger(value, sources)).toThrow();
    const tamperedSources = new Map(sources); tamperedSources.set(hashBytes(bytes.source), "changed");
    expect(() => validateEvidenceLedger(value, tamperedSources, [raw])).toThrow();
    const other = observation("observation_two"); other.risk = "critical"; seal(other);
    expect(() => validateEvidenceLedger(ledger([raw, other]), sources, [raw, other])).toThrow();
  });
});
