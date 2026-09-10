import { contentDigest, digest, hashBytes } from "../core/canonical.js";
import { bindCandidate, validateRegistry } from "../registry/index.js";
import {
  candidateIdentity, parseEvidenceLedger, parseGraderResult, parseRuntimeReport, parseTaskObservation,
  SharedSchemaValidationError, type Candidate, type EvidenceLedger, type ModelRegistry, type TaskObservation
} from "../schema/index.js";

function reject(code: string, path: readonly (string | number)[], message: string): never {
  throw new SharedSchemaValidationError("evidence", [{ code, path, message }]);
}

export type ObservationValidationOptions = {
  readonly runtimeReports?: ReadonlyMap<string, unknown>;
  readonly sources?: ReadonlyMap<string, string | Uint8Array>;
};

export function validateObservation(input: unknown, options: ObservationValidationOptions = {}): TaskObservation {
  const observation = parseTaskObservation(input);
  if (contentDigest(observation) !== observation.content_digest) reject("OBSERVATION_DIGEST_MISMATCH", ["content_digest"], "Observation content changed under its immutable identity.");
  if (observation.lane === "production") {
    const source = options.sources?.get(observation.provenance.source_digest);
    if (source === undefined || hashBytes(source) !== observation.provenance.source_digest) reject("GRADER_SOURCE_UNRESOLVED", ["provenance", "source_digest"], "Production outcomes require the exact grader-result artifact.");
    let rawGrade: unknown;
    try { rawGrade = JSON.parse(typeof source === "string" ? source : new TextDecoder().decode(source)); }
    catch { reject("GRADER_SOURCE_INVALID", ["provenance", "source_digest"], "Grader-result artifact must be JSON."); }
    const grade = parseGraderResult(rawGrade);
    if (grade.task_id !== observation.task_id || grade.fixture_digest !== observation.fixture_digest || grade.candidate_identity !== observation.candidate.candidate_identity || grade.artifact_digest !== observation.provenance.artifact_digest || grade.passed !== observation.passed || grade.accepted !== observation.accepted) reject("GRADER_OBSERVATION_MISMATCH", ["provenance", "source_digest"], "Observation outcomes must agree with the exact graded task, treatment and artifact.");
    for (const [index, check] of grade.checks.entries()) {
      const checkBytes = options.sources?.get(check.evidence_digest);
      if (checkBytes === undefined || hashBytes(checkBytes) !== check.evidence_digest) reject("GRADER_CHECK_UNRESOLVED", ["checks", index], "Executed check evidence must resolve to captured bytes.");
    }
    const receiptDigest = observation.provenance.runtime_receipt_digest!;
    const raw = options.runtimeReports?.get(receiptDigest);
    if (raw === undefined || digest(raw) !== receiptDigest) reject("RUNTIME_RECEIPT_UNRESOLVED", ["provenance", "runtime_receipt_digest"], "Production lineage requires the exact runtime receipt bytes.");
    const receipt = parseRuntimeReport(raw);
    if (receipt.provider === "synthetic" || receipt.candidate_id !== observation.candidate.candidate_id || receipt.stdout_digest === undefined || receipt.stderr_digest === undefined) reject("RUNTIME_RECEIPT_MISMATCH", ["provenance"], "Native receipt must identify the candidate and captured stdout/stderr.");
    if (observation.passed && (receipt.status !== "completed" || receipt.exit_code !== 0 || receipt.signal !== null)) reject("RUNTIME_OUTCOME_MISMATCH", ["passed"], "A failed native execution cannot establish a passing observation.");
  }
  return observation;
}

export type ObservationSummary = {
  readonly attempted: number;
  readonly passed: number;
  readonly accepted: number;
  readonly total_cost_usd: number | null;
  readonly cost_per_accepted_task_usd: number | null;
};

/** All worker/review/rework attempts count; missing cost never becomes zero. */
export function summarizeObservations(observations: readonly TaskObservation[]): ObservationSummary {
  const costs = observations.flatMap((observation) => observation.attempts.map((attempt) => attempt.cost_usd));
  const total = costs.some((cost) => cost === null) ? null : costs.reduce<number>((sum, cost) => sum + cost!, 0);
  if (total !== null && !Number.isFinite(total)) reject("NONFINITE_AGGREGATE", ["total_cost_usd"], "Summed costs exceeded finite numeric range.");
  const accepted = observations.filter((observation) => observation.accepted).length;
  return { attempted: observations.length, passed: observations.filter((observation) => observation.passed).length, accepted, total_cost_usd: total, cost_per_accepted_task_usd: accepted === 0 || total === null ? null : total / accepted };
}

export type EvidenceValidationOptions = ObservationValidationOptions & {
  readonly registry: ModelRegistry;
  readonly candidates: readonly Candidate[];
  readonly mode: "simulation" | "production";
  readonly sources: ReadonlyMap<string, string | Uint8Array>;
  readonly allowConfigurationPinning?: boolean;
};

export function validateObservations(inputs: readonly unknown[], options: EvidenceValidationOptions): TaskObservation[] {
  const registry = validateRegistry(options.registry);
  const candidates = new Map(options.candidates.map((candidate) => {
    const bound = bindCandidate(candidate, registry, options);
    return [bound.candidate_id, bound] as const;
  }));
  if (candidates.size !== options.candidates.length) reject("DUPLICATE_CANDIDATE", ["candidates"], "Candidate IDs must be unique.");
  const ids = new Set<string>();
  return inputs.map((input, index) => {
    const observation = validateObservation(input, options);
    if (ids.has(observation.observation_id)) reject("DUPLICATE_OBSERVATION", [index, "observation_id"], "Observations cannot be counted twice.");
    ids.add(observation.observation_id);
    for (const [key, reference] of Object.entries({ fixture_digest: observation.fixture_digest, source_digest: observation.provenance.source_digest, artifact_digest: observation.provenance.artifact_digest })) {
      const source = options.sources.get(reference);
      if (source === undefined || hashBytes(source) !== reference) reject("OBSERVATION_SOURCE_UNRESOLVED", [index, key], "Observation lineage requires exact source bytes.");
    }
    if (observation.lane === "production") {
      const receipt = parseRuntimeReport(options.runtimeReports!.get(observation.provenance.runtime_receipt_digest!));
      for (const key of ["stdout_digest", "stderr_digest"] as const) {
        const reference = receipt[key]!;
        const source = options.sources.get(reference);
        if (source === undefined || hashBytes(source) !== reference) reject("RUNTIME_STREAM_UNRESOLVED", [index, key], "Production execution requires matching captured stream bytes.");
      }
    }
    const candidate = candidates.get(observation.candidate.candidate_id);
    if (candidate === undefined || candidateIdentity(candidate) !== observation.candidate.candidate_identity) reject("CANDIDATE_IDENTITY_MISMATCH", [index, "candidate"], "Observation must match the exact candidate treatment.");
    const record = registry.records.find((entry) => entry.record_id === candidate.provenance.model_record_id)!;
    if (options.mode === "production" && (observation.lane !== "production" || candidate.provider === "synthetic" || record.pinning?.source === "synthetic_fixture")) reject("SYNTHETIC_EVIDENCE_REJECTED", [index, "lane"], "Synthetic observations and registry authority cannot qualify production candidates.");
    return observation;
  });
}

/** Structural loading plus immutable source resolution; admissibility remains policy-specific. */
export function validateEvidenceLedger(input: unknown, sources: ReadonlyMap<string, string | Uint8Array>, observations: readonly TaskObservation[] = []): EvidenceLedger {
  const ledger = parseEvidenceLedger(input);
  if (contentDigest(ledger) !== ledger.content_digest) reject("LEDGER_DIGEST_MISMATCH", ["content_digest"], "Evidence ledger content changed under its digest.");
  const observationsById = new Map(observations.map((observation) => [observation.observation_id, observation]));
  if (observationsById.size !== observations.length) reject("DUPLICATE_OBSERVATION", ["observations"], "Observation IDs must be unique.");
  for (const [index, record] of ledger.records.entries()) {
    if (contentDigest(record) !== record.content_digest) reject("EVIDENCE_DIGEST_MISMATCH", ["records", index, "content_digest"], "Evidence record contents changed under their digest.");
    if (record.evidence_type === "own_eval") {
      const selected = record.observation_refs.map((id) => {
        const observation = observationsById.get(id);
        if (observation === undefined || contentDigest(observation) !== observation.content_digest) reject("OBSERVATION_UNRESOLVED", ["records", index, "observation_refs"], "Aggregates require intact raw observations.");
        if (observation.candidate.candidate_identity !== record.candidate.candidate_identity || observation.candidate.candidate_id !== record.candidate.candidate_id || observation.suite_id !== record.suite_id || observation.suite_version !== record.suite_version || observation.harness_version !== record.harness_version || observation.grader_version !== record.grader_version || observation.lane !== record.lane) reject("OBSERVATION_STRATUM_MISMATCH", ["records", index, "observation_refs"], "Aggregate treatment, suite, harness and source must match raw observations.");
        return observation;
      });
      const strata = new Set(selected.map((item) => digest({ role: item.role_id, task_class: item.task_class_id, risk: item.risk, constraints: item.constraints_digest, cohort: item.cohort_id })));
      if (strata.size > 1) reject("OBSERVATION_STRATUM_MISMATCH", ["records", index], "Different task strata cannot be pooled into one aggregate.");
      const summary = summarizeObservations(selected);
      for (const key of ["attempted", "passed", "accepted"] as const) if (record[key] !== summary[key]) reject("AGGREGATE_MISMATCH", ["records", index, key], "Aggregate counts must be recomputed from raw observations.");
      if ((record.total_cost_usd ?? null) !== summary.total_cost_usd) reject("AGGREGATE_MISMATCH", ["records", index, "total_cost_usd"], "Aggregate cost must include every attributable attempt.");
    }
    if ("source_digest" in record) {
      const source = sources.get(record.source_digest);
      if (source === undefined) reject("EVIDENCE_SOURCE_MISSING", ["records", index, "source_digest"], "Evidence source bytes are missing.");
      // Source digests cover original bytes, not an independently supplied label.
      if (hashBytes(source) !== record.source_digest) reject("EVIDENCE_SOURCE_TAMPERED", ["records", index, "source_digest"], "Evidence source bytes do not match the cited digest.");
    }
  }
  return ledger;
}
