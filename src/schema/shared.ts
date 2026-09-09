import { z, type ZodType } from "zod";
import { digest } from "../core/canonical.js";

export const sharedSchemaVersion = "model_governor_shared_schemas.v1" as const;

const digestPattern = /^sha256:[a-f0-9]{64}$/;
const identifierPattern = /^[a-z][a-z0-9_:-]{1,95}$/;
const modelIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:/+-]{1,127}$/;
const sourceUrlPattern = /^https?:\/\/\S+$/;

const forbiddenScalarFieldNames = new Set([
  "confidence",
  "confidence_score",
  "coding_quality",
  "model_quality",
  "overall_confidence",
  "overall_quality",
  "quality",
  "quality_score"
]);

export type SchemaIssue = {
  readonly path: readonly (string | number)[];
  readonly code: string;
  readonly message: string;
};

export class SharedSchemaValidationError extends Error {
  readonly issues: readonly SchemaIssue[];

  constructor(label: string, issues: readonly SchemaIssue[]) {
    super(`${label} failed shared schema validation`);
    this.name = "SharedSchemaValidationError";
    this.issues = issues;
  }
}

const strictObject = <T extends z.ZodRawShape>(shape: T) => z.object(shape).strict();

const identifierSchema = z.string().regex(identifierPattern);
const modelIdSchema = z.string().regex(modelIdPattern);
const digestSchema = z.string().regex(digestPattern);
const sourceUrlSchema = z.string().regex(sourceUrlPattern);
const isoDateTimeSchema = z.iso.datetime({ offset: true });
const positiveIntegerSchema = z.number().int().positive().finite();
const nonNegativeIntegerSchema = z.number().int().min(0).finite();
const nonNegativeNumberSchema = z.number().min(0).finite();

export const riskCategorySchema = z.enum(["low", "medium", "high", "critical"]);
export const providerSchema = z.enum(["anthropic", "openai", "local", "synthetic"]);
export const lifecycleSchema = z.enum(["available", "deprecated", "retired", "unavailable", "unknown"]);
export const fallbackModeSchema = z.enum(["disabled", "enabled"]);
export const toolUseModeSchema = z.enum(["none", "host_tools", "provider_tools"]);
export const materialServingSettingKeySchema = z.enum(["fallback", "tool_use", "json_schema"]);
export const evidenceLaneSchema = z.enum(["synthetic_policy_test", "manual_evidence", "production"]);
export const decisionOutcomeSchema = z.enum(["SELECT", "PROMOTE", "RETAIN", "HOLD", "ESCALATION_REQUIRED", "REJECT"]);
export const bindingModeSchema = z.enum(["simulation", "production"]);

const optionalStringArray = z.array(identifierSchema).default([]);

function addDuplicateIssues(
  ctx: z.RefinementCtx,
  values: readonly string[],
  path: readonly (string | number)[],
  rule = "DUPLICATE_IDENTITY"
): void {
  const seen = new Set<string>();
  for (const [index, value] of values.entries()) {
    if (seen.has(value)) {
      ctx.addIssue({
        code: "custom",
        path: [...path, index],
        message: `${rule}: duplicate value '${value}'.`
      });
    }
    seen.add(value);
  }
}

function issueIfAfter(
  ctx: z.RefinementCtx,
  left: string,
  right: string,
  path: readonly (string | number)[],
  rule: string
): void {
  if (Date.parse(left) > Date.parse(right)) {
    ctx.addIssue({
      code: "custom",
      path: [...path],
      message: `${rule}: invalid chronology.`
    });
  }
}

function inspectForbiddenScalarFields(value: unknown, path: readonly (string | number)[] = []): SchemaIssue[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => inspectForbiddenScalarFields(entry, [...path, index]));
  }
  if (value === null || typeof value !== "object") {
    return [];
  }

  const issues: SchemaIssue[] = [];
  for (const [key, child] of Object.entries(value)) {
    const normalized = key.toLowerCase();
    if (forbiddenScalarFieldNames.has(normalized) && typeof child === "number") {
      issues.push({
        path: [...path, key],
        code: "FORBIDDEN_SYNTHETIC_SCALAR",
        message: `Invented scalar '${key}' is not an admissible shared-schema field.`
      });
    }
    issues.push(...inspectForbiddenScalarFields(child, [...path, key]));
  }
  return issues;
}

function parseStrict<T>(label: string, schema: ZodType<T>, input: unknown): T {
  const forbiddenIssues = inspectForbiddenScalarFields(input);
  if (forbiddenIssues.length > 0) {
    throw new SharedSchemaValidationError(label, forbiddenIssues);
  }
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new SharedSchemaValidationError(
      label,
      parsed.error.issues.map((issue) => ({
        path: issue.path.map((part) => (typeof part === "symbol" ? part.toString() : part)),
        code: issue.code,
        message: issue.message
      }))
    );
  }
  return parsed.data;
}

export const roleSchema = strictObject({
  schema_version: z.literal("role.v1"),
  role_id: identifierSchema,
  version: positiveIntegerSchema,
  title: z.string().min(1),
  allowed_task_class_ids: z.array(identifierSchema).nonempty(),
  max_risk: riskCategorySchema,
  requires_independent_review_at: z.array(riskCategorySchema).default([])
}).superRefine((role, ctx) => {
  addDuplicateIssues(ctx, role.allowed_task_class_ids, ["allowed_task_class_ids"]);
  addDuplicateIssues(ctx, role.requires_independent_review_at, ["requires_independent_review_at"]);
});

export const taskClassSchema = strictObject({
  schema_version: z.literal("task_class.v1"),
  task_class_id: identifierSchema,
  version: positiveIntegerSchema,
  title: z.string().min(1),
  risk_floor: riskCategorySchema,
  eval_bucket: strictObject({
    bucket_id: identifierSchema,
    suite_version: positiveIntegerSchema,
    synthetic_only: z.boolean()
  }),
  required_capabilities: optionalStringArray
}).superRefine((taskClass, ctx) => {
  addDuplicateIssues(ctx, taskClass.required_capabilities, ["required_capabilities"]);
});

export const constraintSetSchema = strictObject({
  schema_version: z.literal("constraint_set.v1"),
  constraint_id: identifierSchema,
  version: positiveIntegerSchema,
  allowed_tools: z.array(identifierSchema).default([]),
  required_tools: z.array(identifierSchema).default([]),
  forbidden_paths: z.array(z.string().min(1)).default([]),
  max_cost_usd: nonNegativeNumberSchema.nullable().optional(),
  max_latency_ms: positiveIntegerSchema.optional(),
  requires_fresh_context: z.boolean().default(false),
  requires_local_execution: z.boolean().default(false),
  requires_provider: providerSchema.optional(),
  requires_vision: z.boolean().optional(),
  requires_browser: z.boolean().optional(),
  context_window_requirement: positiveIntegerSchema.optional(),
  language: z.string().min(1).optional(),
  privacy_requirement: z.string().min(1).optional()
}).superRefine((constraints, ctx) => {
  addDuplicateIssues(ctx, constraints.allowed_tools, ["allowed_tools"]);
  addDuplicateIssues(ctx, constraints.required_tools, ["required_tools"]);
  addDuplicateIssues(ctx, constraints.forbidden_paths, ["forbidden_paths"], "DUPLICATE_PATH");
});

export const modelPinningSchema = strictObject({
  verified: z.boolean(),
  immutable_snapshot: z.boolean().nullable(),
  source: z.enum(["official_metadata", "registry_metadata", "synthetic_fixture"]),
  source_url: sourceUrlSchema.optional(),
  retrieved_at: isoDateTimeSchema,
  evidence_digest: digestSchema
});

export const servingSupportSchema = strictObject({
  fallback: z.array(fallbackModeSchema).nonempty(),
  tool_use: z.array(toolUseModeSchema).nonempty(),
  json_schema: z.array(z.boolean()).nonempty()
}).superRefine((support, ctx) => {
  addDuplicateIssues(ctx, support.fallback, ["fallback"]);
  addDuplicateIssues(ctx, support.tool_use, ["tool_use"]);
  addDuplicateIssues(ctx, support.json_schema.map(String), ["json_schema"]);
});

export const servingConfigurationSchema = strictObject({
  fallback: fallbackModeSchema,
  tool_use: toolUseModeSchema,
  json_schema: z.boolean()
});

export const modelRecordSchema = strictObject({
  schema_version: z.literal("model_record.v1"),
  record_id: identifierSchema,
  provider: providerSchema,
  model_id: modelIdSchema,
  snapshot_id: modelIdSchema,
  family: identifierSchema.nullable(),
  capabilities: z.array(identifierSchema).nullable().default(null),
  frontier: z.boolean().nullable().default(null),
  lifecycle: lifecycleSchema,
  content_digest: digestSchema,
  aliases: z.array(modelIdSchema).default([]),
  supported_efforts: z.array(z.string().min(1)).nonempty(),
  supported_serving_settings: servingSupportSchema,
  material_serving_settings: z.array(materialServingSettingKeySchema).nonempty(),
  context_window_tokens: positiveIntegerSchema.nullable(),
  pinning: modelPinningSchema.nullable()
}).superRefine((record, ctx) => {
  addDuplicateIssues(ctx, record.aliases, ["aliases"], "DUPLICATE_ALIAS");
  addDuplicateIssues(ctx, record.supported_efforts, ["supported_efforts"]);
  addDuplicateIssues(ctx, record.material_serving_settings, ["material_serving_settings"]);
  if (record.aliases.includes(record.model_id) || record.aliases.includes(record.snapshot_id)) {
    ctx.addIssue({
      code: "custom",
      path: ["aliases"],
      message: "ALIAS_MUST_NOT_EQUAL_PINNED_ID: alias list cannot contain the canonical model or snapshot ID."
    });
  }
});

export const modelRegistrySchema = strictObject({
  schema_version: z.literal("model_registry.v1"),
  registry_id: identifierSchema,
  content_digest: digestSchema,
  retrieved_at: isoDateTimeSchema,
  records: z.array(modelRecordSchema).nonempty()
}).superRefine((registry, ctx) => {
  addDuplicateIssues(ctx, registry.records.map((record) => record.record_id), ["records"]);
  addDuplicateIssues(
    ctx,
    registry.records.map((record) => `${record.provider}:${record.model_id}`),
    ["records"],
    "DUPLICATE_MODEL_IDENTITY"
  );
  addDuplicateIssues(
    ctx,
    registry.records.map((record) => `${record.provider}:${record.snapshot_id}`),
    ["records"],
    "DUPLICATE_SNAPSHOT_IDENTITY"
  );
});

export const candidateSchema = strictObject({
  schema_version: z.literal("candidate.v1"),
  candidate_id: identifierSchema,
  provider: providerSchema,
  model_id: modelIdSchema,
  snapshot_id: modelIdSchema,
  effort: z.string().min(1),
  serving: servingConfigurationSchema,
  material_serving_settings: z.array(materialServingSettingKeySchema).nonempty(),
  provenance: strictObject({
    registry_id: identifierSchema,
    model_record_id: identifierSchema,
    registry_content_digest: digestSchema
  })
}).superRefine((candidate, ctx) => {
  addDuplicateIssues(ctx, candidate.material_serving_settings, ["material_serving_settings"]);
});

export const candidateRefSchema = strictObject({
  candidate_id: identifierSchema,
  candidate_identity: digestSchema
});

export const ownEvalEvidenceSchema = strictObject({
  schema_version: z.literal("evidence_record.v1"),
  evidence_id: identifierSchema,
  content_digest: digestSchema,
  evidence_type: z.literal("own_eval"),
  lane: evidenceLaneSchema,
  candidate: candidateRefSchema,
  suite_id: identifierSchema,
  suite_version: positiveIntegerSchema,
  dataset_version: z.string().min(1),
  methodology_version: z.string().min(1),
  harness_version: z.string().min(1),
  grader_version: z.string().min(1),
  measured_at: isoDateTimeSchema,
  retrieved_at: isoDateTimeSchema,
  observation_refs: z.array(identifierSchema),
  attempted: nonNegativeIntegerSchema,
  passed: nonNegativeIntegerSchema,
  accepted: nonNegativeIntegerSchema,
  total_cost_usd: nonNegativeNumberSchema.nullable().optional(),
  median_latency_ms: nonNegativeNumberSchema.nullable().optional(),
  source_digest: digestSchema
}).superRefine((evidence, ctx) => {
  addDuplicateIssues(ctx, evidence.observation_refs, ["observation_refs"]);
  if (evidence.passed > evidence.attempted) {
    ctx.addIssue({ code: "custom", path: ["passed"], message: "IMPOSSIBLE_COUNT: passed cannot exceed attempted." });
  }
  if (evidence.accepted > evidence.attempted) {
    ctx.addIssue({ code: "custom", path: ["accepted"], message: "IMPOSSIBLE_COUNT: accepted cannot exceed attempted." });
  }
  issueIfAfter(ctx, evidence.measured_at, evidence.retrieved_at, ["retrieved_at"], "INVALID_CHRONOLOGY");
});

export const externalBenchmarkEvidenceSchema = strictObject({
  schema_version: z.literal("evidence_record.v1"),
  evidence_id: identifierSchema,
  content_digest: digestSchema,
  evidence_type: z.literal("external_benchmark"),
  lane: evidenceLaneSchema,
  candidate: candidateRefSchema,
  source_name: identifierSchema,
  benchmark_name: identifierSchema,
  benchmark_version: z.string().min(1),
  dataset_version: z.string().min(1).optional(),
  methodology_version: z.string().min(1),
  metric: strictObject({
    metric_name: identifierSchema,
    value: z.number().finite(),
    scale: z.string().min(1),
    higher_is_better: z.boolean()
  }),
  measured_at: isoDateTimeSchema,
  retrieved_at: isoDateTimeSchema,
  source_url: sourceUrlSchema,
  source_digest: digestSchema
}).superRefine((evidence, ctx) => {
  issueIfAfter(ctx, evidence.measured_at, evidence.retrieved_at, ["retrieved_at"], "INVALID_CHRONOLOGY");
});

export const manualEvidenceSchema = strictObject({
  schema_version: z.literal("evidence_record.v1"),
  evidence_id: identifierSchema,
  content_digest: digestSchema,
  evidence_type: z.literal("owner_decision"),
  lane: z.literal("manual_evidence"),
  candidate: candidateRefSchema.optional(),
  decision_id: identifierSchema,
  decided_at: isoDateTimeSchema,
  owner: z.string().min(1),
  reason_code: identifierSchema,
  artifact_digest: digestSchema
});

export const evidenceRecordSchema = z.discriminatedUnion("evidence_type", [
  ownEvalEvidenceSchema,
  externalBenchmarkEvidenceSchema,
  manualEvidenceSchema
]);

export const evidenceLedgerSchema = strictObject({
  schema_version: z.literal("evidence_ledger.v1"),
  ledger_id: identifierSchema,
  content_digest: digestSchema,
  created_at: isoDateTimeSchema,
  records: z.array(evidenceRecordSchema)
}).superRefine((ledger, ctx) => {
  addDuplicateIssues(ctx, ledger.records.map((record) => record.evidence_id), ["records"]);
});

export const decisionRecordSchema = strictObject({
  schema_version: z.literal("decision_record.v1"),
  decision_id: identifierSchema,
  policy_version: positiveIntegerSchema,
  policy_digest: digestSchema,
  candidate_set_digest: digestSchema,
  evidence_digest: digestSchema,
  outcome: decisionOutcomeSchema,
  selected_candidate_id: identifierSchema.optional(),
  considered_candidate_ids: z.array(identifierSchema),
  evidence_refs: z.array(identifierSchema).default([]),
  rule_ids: z.array(identifierSchema).nonempty(),
  created_at: isoDateTimeSchema
}).superRefine((decision, ctx) => {
  addDuplicateIssues(ctx, decision.considered_candidate_ids, ["considered_candidate_ids"]);
  addDuplicateIssues(ctx, decision.evidence_refs, ["evidence_refs"]);
  addDuplicateIssues(ctx, decision.rule_ids, ["rule_ids"]);
  if ((decision.outcome === "SELECT" || decision.outcome === "PROMOTE" || decision.outcome === "RETAIN") && decision.selected_candidate_id === undefined) {
    ctx.addIssue({
      code: "custom",
      path: ["selected_candidate_id"],
      message: "SELECTED_CANDIDATE_REQUIRED: successful routing decisions need an explicit selected candidate."
    });
  }
});

export const bindingSchema = strictObject({
  schema_version: z.literal("binding.v1"),
  binding_id: identifierSchema,
  mode: bindingModeSchema,
  policy_version: positiveIntegerSchema,
  policy_digest: digestSchema,
  schema_digest: digestSchema,
  generated_at: isoDateTimeSchema,
  refresh_due_at: isoDateTimeSchema,
  hard_expiry_at: isoDateTimeSchema,
  role_id: identifierSchema,
  task_class_id: identifierSchema,
  risk: riskCategorySchema,
  candidate: candidateSchema,
  decision: decisionRecordSchema,
  evidence_refs: z.array(identifierSchema).nonempty(),
  candidate_set_digest: digestSchema,
  evidence_digest: digestSchema,
  production_synthetic_evidence: z.literal(false)
}).superRefine((binding, ctx) => {
  issueIfAfter(ctx, binding.generated_at, binding.refresh_due_at, ["refresh_due_at"], "INVALID_CHRONOLOGY");
  if (Date.parse(binding.refresh_due_at) >= Date.parse(binding.hard_expiry_at)) {
    ctx.addIssue({
      code: "custom",
      path: ["hard_expiry_at"],
      message: "INVALID_CHRONOLOGY: hard expiry must be after refresh due."
    });
  }
  addDuplicateIssues(ctx, binding.evidence_refs, ["evidence_refs"]);
  for (const key of ["policy_version", "policy_digest", "candidate_set_digest", "evidence_digest"] as const) {
    if (binding[key] !== binding.decision[key]) ctx.addIssue({ code: "custom", path: ["decision", key], message: "BINDING_DECISION_MISMATCH: binding and decision identities must agree." });
  }
  if (binding.decision.selected_candidate_id !== binding.candidate.candidate_id || !binding.decision.considered_candidate_ids.includes(binding.candidate.candidate_id) || !["SELECT", "PROMOTE", "RETAIN"].includes(binding.decision.outcome)) {
    ctx.addIssue({ code: "custom", path: ["decision"], message: "BINDING_DECISION_MISMATCH: binding must name a successful decision for its candidate." });
  }
  if (digest([...binding.evidence_refs].sort()) !== digest([...binding.decision.evidence_refs].sort())) ctx.addIssue({ code: "custom", path: ["evidence_refs"], message: "BINDING_DECISION_MISMATCH: binding and decision evidence references must agree." });
  if (binding.mode === "production" && binding.production_synthetic_evidence !== false) {
    ctx.addIssue({
      code: "custom",
      path: ["production_synthetic_evidence"],
      message: "SYNTHETIC_EVIDENCE_REJECTED_IN_PRODUCTION: production bindings cannot cite synthetic evidence."
    });
  }
});

export const runtimeReportSchema = strictObject({
  schema_version: z.literal("runtime_report.v1"),
  report_id: identifierSchema,
  provider: providerSchema,
  candidate_id: identifierSchema,
  started_at: isoDateTimeSchema,
  completed_at: isoDateTimeSchema,
  command: strictObject({
    executable: z.string().min(1),
    args: z.array(z.string()),
    cwd: z.string().min(1)
  }),
  status: z.enum(["completed", "failed", "timed_out", "blocked"]),
  exit_code: z.number().int().finite().nullable(),
  signal: z.string().min(1).nullable(),
  timeout_ms: positiveIntegerSchema,
  stdout_digest: digestSchema.optional(),
  stderr_digest: digestSchema.optional(),
  observed_identity: strictObject({
    model_id: modelIdSchema.optional(),
    effort: z.string().min(1).optional(),
    source: z.enum(["provider_receipt", "runtime_report", "unknown"])
  }),
  usage: strictObject({
    input_tokens: nonNegativeIntegerSchema.optional(),
    output_tokens: nonNegativeIntegerSchema.optional(),
    cost_usd: nonNegativeNumberSchema.nullable().optional()
  }).optional()
}).superRefine((report, ctx) => {
  issueIfAfter(ctx, report.started_at, report.completed_at, ["completed_at"], "INVALID_CHRONOLOGY");
});

export const graderResultSchema = strictObject({
  schema_version: z.literal("grader_result.v1"),
  task_id: identifierSchema,
  fixture_digest: digestSchema,
  candidate_identity: digestSchema,
  artifact_digest: digestSchema,
  passed: z.boolean(),
  accepted: z.boolean(),
  checks: z.array(strictObject({ check_id: identifierSchema, passed: z.boolean(), evidence_digest: digestSchema })).nonempty()
}).superRefine((result, ctx) => {
  addDuplicateIssues(ctx, result.checks.map((check) => check.check_id), ["checks"]);
  if (result.passed !== result.checks.every((check) => check.passed) || (result.accepted && !result.passed)) ctx.addIssue({ code: "custom", path: ["passed"], message: "GRADER_OUTCOME_MISMATCH: grader outcomes must agree with executed checks." });
});
export type GraderResult = z.infer<typeof graderResultSchema>;
export function parseGraderResult(input: unknown): GraderResult { return parseStrict("grader_result", graderResultSchema, input); }

export const taskObservationSchema = strictObject({
  schema_version: z.literal("task_observation.v1"),
  observation_id: identifierSchema,
  content_digest: digestSchema,
  lane: z.enum(["synthetic_policy_test", "production"]),
  candidate: candidateRefSchema,
  task_id: identifierSchema,
  fixture_digest: digestSchema,
  cohort_id: identifierSchema,
  role_id: identifierSchema,
  task_class_id: identifierSchema,
  risk: riskCategorySchema,
  constraints_digest: digestSchema,
  suite_id: identifierSchema,
  suite_version: positiveIntegerSchema,
  harness_version: z.string().min(1),
  grader_version: z.string().min(1),
  measured_at: isoDateTimeSchema,
  passed: z.boolean(),
  accepted: z.boolean(),
  failure_categories: z.array(identifierSchema).optional(),
  latency_ms: nonNegativeNumberSchema.nullable(),
  attempts: z.array(strictObject({
    attempt_id: identifierSchema,
    kind: z.enum(["worker", "review", "rework"]),
    cost_usd: nonNegativeNumberSchema.nullable(),
    cost_source: z.enum(["measured", "provider_estimate", "unknown"]),
    pricing_digest: digestSchema.optional(),
    latency_ms: nonNegativeNumberSchema.nullable()
  })).nonempty(),
  provenance: strictObject({
    source: z.enum(["native_runtime", "synthetic_fixture"]),
    source_digest: digestSchema,
    artifact_digest: digestSchema,
    runtime_receipt_digest: digestSchema.nullable()
  })
}).superRefine((observation, ctx) => {
  addDuplicateIssues(ctx, observation.attempts.map((attempt) => attempt.attempt_id), ["attempts"]);
  addDuplicateIssues(ctx, observation.failure_categories ?? [], ["failure_categories"]);
  if (observation.accepted && !observation.passed) ctx.addIssue({ code: "custom", path: ["accepted"], message: "IMPOSSIBLE_OUTCOME: accepted task must pass its checks." });
  if (observation.lane === "production" && (observation.provenance.source !== "native_runtime" || observation.provenance.runtime_receipt_digest === null)) ctx.addIssue({ code: "custom", path: ["provenance"], message: "PRODUCTION_PROVENANCE_REQUIRED: production observations require native execution lineage." });
  if (observation.lane === "synthetic_policy_test" && observation.provenance.source !== "synthetic_fixture") ctx.addIssue({ code: "custom", path: ["provenance", "source"], message: "EVIDENCE_LANE_MISMATCH: synthetic observations must remain labeled synthetic." });
  for (const [index, attempt] of observation.attempts.entries()) {
    if ((attempt.cost_usd === null) !== (attempt.cost_source === "unknown")) ctx.addIssue({ code: "custom", path: ["attempts", index, "cost_source"], message: "COST_PROVENANCE_REQUIRED: known costs need a measurement or estimate source; unknown cost stays null." });
  }
});
export type TaskObservation = z.infer<typeof taskObservationSchema>;
export function parseTaskObservation(input: unknown): TaskObservation { return parseStrict("task_observation", taskObservationSchema, input); }

export const workOrderSchema = strictObject({
  schema_version: z.literal("work_order.v1"),
  work_order_id: identifierSchema,
  created_at: isoDateTimeSchema,
  role_id: identifierSchema,
  task_class_id: identifierSchema,
  pre_dispatch_risk: riskCategorySchema,
  constraints: constraintSetSchema,
  input_digest: digestSchema,
  allowed_paths: z.array(z.string().min(1)).nonempty(),
  forbidden_paths: z.array(z.string().min(1)).default([])
}).superRefine((workOrder, ctx) => {
  addDuplicateIssues(ctx, workOrder.allowed_paths, ["allowed_paths"], "DUPLICATE_PATH");
  addDuplicateIssues(ctx, workOrder.forbidden_paths, ["forbidden_paths"], "DUPLICATE_PATH");
});

export const reviewRecordSchema = strictObject({
  schema_version: z.literal("review_record.v1"),
  review_id: identifierSchema,
  work_order_id: identifierSchema,
  reviewer_candidate_id: identifierSchema,
  reviewed_artifact_digest: digestSchema,
  reviewed_at: isoDateTimeSchema,
  outcome: z.enum(["accepted", "rejected", "escalated"]),
  independence: strictObject({
    fresh_context: z.boolean(),
    different_family: z.boolean(),
    source: z.enum(["runtime_receipt", "owner_decision", "unknown"])
  }),
  rule_ids: z.array(identifierSchema).nonempty()
}).superRefine((review, ctx) => {
  addDuplicateIssues(ctx, review.rule_ids, ["rule_ids"]);
});

export const refreshProposalSchema = strictObject({
  schema_version: z.literal("refresh_proposal.v1"),
  proposal_id: identifierSchema,
  generated_at: isoDateTimeSchema,
  policy_version: positiveIntegerSchema,
  policy_digest: digestSchema,
  current_binding_id: identifierSchema.optional(),
  proposed_binding: bindingSchema.optional(),
  decision: z.enum(["PROMOTE", "HOLD", "ESCALATION_REQUIRED"]),
  evidence_refs: z.array(identifierSchema).default([]),
  rule_ids: z.array(identifierSchema).nonempty()
}).superRefine((proposal, ctx) => {
  addDuplicateIssues(ctx, proposal.evidence_refs, ["evidence_refs"]);
  addDuplicateIssues(ctx, proposal.rule_ids, ["rule_ids"]);
  if (proposal.decision === "PROMOTE" && proposal.proposed_binding === undefined) {
    ctx.addIssue({ code: "custom", path: ["proposed_binding"], message: "PROPOSED_BINDING_REQUIRED: promotion needs a proposed binding." });
  }
});

export const proofReportSchema = strictObject({
  schema_version: z.literal("proof_report.v1"),
  proof_report_id: identifierSchema,
  generated_at: isoDateTimeSchema,
  artifact_digests: z.array(digestSchema).nonempty(),
  checks: z.array(strictObject({
    check_id: identifierSchema,
    command: z.string().min(1),
    started_at: isoDateTimeSchema,
    completed_at: isoDateTimeSchema,
    status: z.enum(["passed", "failed", "blocked", "insufficient_evidence"]),
    stdout_digest: digestSchema.optional(),
    stderr_digest: digestSchema.optional()
  })).nonempty()
}).superRefine((report, ctx) => {
  addDuplicateIssues(ctx, report.artifact_digests, ["artifact_digests"], "DUPLICATE_DIGEST");
  addDuplicateIssues(ctx, report.checks.map((check) => check.check_id), ["checks"]);
  for (const [index, check] of report.checks.entries()) {
    issueIfAfter(ctx, check.started_at, check.completed_at, ["checks", index, "completed_at"], "INVALID_CHRONOLOGY");
  }
});

export type Role = z.infer<typeof roleSchema>;
export type TaskClass = z.infer<typeof taskClassSchema>;
export type RiskCategory = z.infer<typeof riskCategorySchema>;
export type ConstraintSet = z.infer<typeof constraintSetSchema>;
export type ModelRecord = z.infer<typeof modelRecordSchema>;
export type ModelRegistry = z.infer<typeof modelRegistrySchema>;
export type ServingConfiguration = z.infer<typeof servingConfigurationSchema>;
export type Candidate = z.infer<typeof candidateSchema>;
export type EvidenceRecord = z.infer<typeof evidenceRecordSchema>;
export type EvidenceLedger = z.infer<typeof evidenceLedgerSchema>;
export type DecisionRecord = z.infer<typeof decisionRecordSchema>;
export type Binding = z.infer<typeof bindingSchema>;
export type RuntimeReport = z.infer<typeof runtimeReportSchema>;
export type WorkOrder = z.infer<typeof workOrderSchema>;
export type ReviewRecord = z.infer<typeof reviewRecordSchema>;
export type RefreshProposal = z.infer<typeof refreshProposalSchema>;
export type ProofReport = z.infer<typeof proofReportSchema>;

export function parseRole(input: unknown): Role {
  return parseStrict("role", roleSchema, input);
}

export function parseTaskClass(input: unknown): TaskClass {
  return parseStrict("task_class", taskClassSchema, input);
}

export function parseConstraintSet(input: unknown): ConstraintSet {
  return parseStrict("constraint_set", constraintSetSchema, input);
}

export function parseModelRegistry(input: unknown): ModelRegistry {
  return parseStrict("model_registry", modelRegistrySchema, input);
}

export function parseCandidate(input: unknown): Candidate {
  return parseStrict("candidate", candidateSchema, input);
}

export function parseEvidenceRecord(input: unknown): EvidenceRecord {
  return parseStrict("evidence_record", evidenceRecordSchema, input);
}

export function parseEvidenceLedger(input: unknown): EvidenceLedger {
  return parseStrict("evidence_ledger", evidenceLedgerSchema, input);
}

export function parseDecisionRecord(input: unknown): DecisionRecord {
  return parseStrict("decision_record", decisionRecordSchema, input);
}

export function parseBinding(input: unknown): Binding {
  return parseStrict("binding", bindingSchema, input);
}

export function parseRuntimeReport(input: unknown): RuntimeReport {
  return parseStrict("runtime_report", runtimeReportSchema, input);
}

export function parseWorkOrder(input: unknown): WorkOrder {
  return parseStrict("work_order", workOrderSchema, input);
}

export function parseReviewRecord(input: unknown): ReviewRecord {
  return parseStrict("review_record", reviewRecordSchema, input);
}

export function parseRefreshProposal(input: unknown): RefreshProposal {
  return parseStrict("refresh_proposal", refreshProposalSchema, input);
}

export function parseProofReport(input: unknown): ProofReport {
  return parseStrict("proof_report", proofReportSchema, input);
}

export function candidateIdentity(candidate: Candidate): string {
  const serving = Object.fromEntries(
    [...candidate.material_serving_settings].sort().map((key) => [key, candidate.serving[key]])
  );
  return digest({ provider: candidate.provider, snapshot_id: candidate.snapshot_id, effort: candidate.effort, serving });
}

export function validateCandidateAgainstRegistry(candidateInput: unknown, registryInput: unknown): Candidate {
  const registry = parseModelRegistry(registryInput);
  const candidate = parseCandidate(candidateInput);
  const record = registry.records.find((entry) => entry.record_id === candidate.provenance.model_record_id);

  const issues: SchemaIssue[] = [];
  if (candidate.provenance.registry_id !== registry.registry_id) {
    issues.push({
      path: ["provenance", "registry_id"],
      code: "REGISTRY_MISMATCH",
      message: "Candidate provenance registry_id does not match the supplied registry."
    });
  }
  if (record === undefined) {
    issues.push({
      path: ["provenance", "model_record_id"],
      code: "UNKNOWN_MODEL_RECORD",
      message: "Candidate references a model record absent from the supplied registry."
    });
  } else {
    if (candidate.provenance.registry_content_digest !== registry.content_digest) {
      issues.push({
        path: ["provenance", "registry_content_digest"],
        code: "REGISTRY_DIGEST_MISMATCH",
        message: "Candidate pinning was not verified against this registry digest."
      });
    }
    if (record.aliases.includes(candidate.model_id) || record.aliases.includes(candidate.snapshot_id)) {
      issues.push({
        path: ["model_id"],
        code: "MODEL_ALIAS_REJECTED",
        message: "Candidate uses a registry alias instead of the canonical pinned model snapshot."
      });
    }
    if (candidate.provider !== record.provider || candidate.model_id !== record.model_id || candidate.snapshot_id !== record.snapshot_id) {
      issues.push({
        path: ["model_id"],
        code: "PINNED_MODEL_ID_REQUIRED",
        message: "Candidate model identity must exactly match the verified registry metadata."
      });
    }
    if (record.lifecycle !== "available") {
      issues.push({
        path: ["provenance", "model_record_id"],
        code: "MODEL_MUST_BE_AVAILABLE",
        message: "Candidate registry record is not available."
      });
    }
    if (record.pinning === null || !record.pinning.verified || record.pinning.immutable_snapshot !== true) {
      issues.push({
        path: ["provenance", "model_record_id"],
        code: "PINNING_NOT_VERIFIED",
        message: "Registry metadata does not verify this candidate as an immutable snapshot."
      });
    }
    if (!record.supported_efforts.includes(candidate.effort)) {
      issues.push({
        path: ["effort"],
        code: "UNSUPPORTED_EFFORT",
        message: "Candidate effort is not supported by the verified registry record."
      });
    }
    if (!record.supported_serving_settings.fallback.includes(candidate.serving.fallback)) {
      issues.push({
        path: ["serving", "fallback"],
        code: "UNSUPPORTED_SERVING_CONFIGURATION",
        message: "Candidate fallback setting is not supported by the verified registry record."
      });
    }
    if (!record.supported_serving_settings.tool_use.includes(candidate.serving.tool_use)) {
      issues.push({
        path: ["serving", "tool_use"],
        code: "UNSUPPORTED_SERVING_CONFIGURATION",
        message: "Candidate tool_use setting is not supported by the verified registry record."
      });
    }
    if (!record.supported_serving_settings.json_schema.includes(candidate.serving.json_schema)) {
      issues.push({
        path: ["serving", "json_schema"],
        code: "UNSUPPORTED_SERVING_CONFIGURATION",
        message: "Candidate json_schema setting is not supported by the verified registry record."
      });
    }
    const candidateMaterial = new Set(candidate.material_serving_settings);
    for (const materialKey of record.material_serving_settings) {
      if (!candidateMaterial.has(materialKey)) {
        issues.push({
          path: ["material_serving_settings"],
          code: "MATERIAL_SERVING_SETTING_NOT_DECLARED",
          message: `Candidate omits material serving setting '${materialKey}'.`
        });
      }
    }
    const recordMaterial = new Set(record.material_serving_settings);
    for (const materialKey of candidate.material_serving_settings) {
      if (!recordMaterial.has(materialKey)) {
        issues.push({
          path: ["material_serving_settings"],
          code: "UNSUPPORTED_MATERIAL_SERVING_SETTING",
          message: `Candidate declares unsupported material serving setting '${materialKey}'.`
        });
      }
    }
  }

  if (issues.length > 0) {
    throw new SharedSchemaValidationError("candidate_registry_validation", issues);
  }
  return candidate;
}

export function validateCandidateSetAgainstRegistry(candidateInputs: readonly unknown[], registryInput: unknown): Candidate[] {
  const candidates = candidateInputs.map((candidateInput) => validateCandidateAgainstRegistry(candidateInput, registryInput));
  const issues: SchemaIssue[] = [];
  const candidateIds = new Set<string>();
  const identities = new Set<string>();
  for (const candidate of candidates) {
    if (candidateIds.has(candidate.candidate_id)) {
      issues.push({
        path: ["candidate_id"],
        code: "DUPLICATE_IDENTITY",
        message: `Duplicate candidate_id '${candidate.candidate_id}'.`
      });
    }
    candidateIds.add(candidate.candidate_id);
    const identity = candidateIdentity(candidate);
    if (identities.has(identity)) {
      issues.push({
        path: ["candidate_identity"],
        code: "DUPLICATE_IDENTITY",
        message: `Duplicate candidate treatment '${identity}'.`
      });
    }
    identities.add(identity);
  }
  if (issues.length > 0) {
    throw new SharedSchemaValidationError("candidate_set", issues);
  }
  return candidates;
}

export const sharedSchemas = {
  bindingSchema,
  candidateSchema,
  constraintSetSchema,
  decisionRecordSchema,
  evidenceLedgerSchema,
  evidenceRecordSchema,
  graderResultSchema,
  modelRecordSchema,
  modelRegistrySchema,
  proofReportSchema,
  refreshProposalSchema,
  reviewRecordSchema,
  riskCategorySchema,
  roleSchema,
  runtimeReportSchema,
  servingConfigurationSchema,
  taskClassSchema,
  taskObservationSchema,
  workOrderSchema
} as const;


/** Generated structural projection. Custom refinements and external references
 * still require the exported runtime parsers/validators; JSON Schema is not authority.
 */
export function sharedJsonSchema(): Record<string, unknown> {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://model-governor.local/schemas/model-governor.shared.schema.json",
    schema_version: sharedSchemaVersion,
    "x-runtime-source": "src/schema/shared.ts",
    "x-validation-limit": "Generated structural projection only. Runtime refinements, chronology, duplicate identity, integrity, and provenance resolution require the exported TypeScript validators.",
    $defs: Object.fromEntries(Object.entries(sharedSchemas).map(([name, schema]) => [name, z.toJSONSchema(schema, { io: "input" })])),
    anyOf: Object.keys(sharedSchemas).map((name) => ({ $ref: `#/$defs/${name}` }))
  };
}
