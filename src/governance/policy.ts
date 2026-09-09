import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { z } from 'zod';
import { riskCategorySchema } from '../schema/index.js';
import { digest } from '../core/canonical.js';

const id = z.string().regex(/^[a-z][a-z0-9_:-]{1,95}$/);
const finite = z.number().finite();
const ratio = finite.min(0).max(1);
const bucket = z.object({
  suite_id: id, suite_version: z.number().int().positive(),
  harness_version: z.string().min(1), grader_version: z.string().min(1),
  fixture_ids: z.array(id).nonempty(),
}).strict();
const reviewRule = z.object({ required: z.boolean(), different_model: z.boolean(),
  different_family: z.boolean(), fresh_context: z.boolean(), frontier: z.boolean() }).strict();
export const policySchema = z.object({
  schema_version: z.literal('governance_policy.v1'), policy_version: z.number().int().positive(),
  provenance: z.object({ status: z.literal('proposed'), author: z.string().min(1),
    source: z.string().min(1), rationale: z.string().min(1) }).strict(),
  roles: z.array(z.object({ role_id: id, task_class_ids: z.array(id).nonempty() }).strict()).nonempty(),
  task_classes: z.array(z.object({ task_class_id: id, risk_floor: riskCategorySchema,
    required_capabilities: z.array(id), eval_bucket: bucket }).strict()).min(1).max(8),
  risk_signals: z.record(id, riskCategorySchema),
  review: z.object({ low: reviewRule, medium: reviewRule, high: reviewRule, critical: reviewRule }).strict(),
  qualification: z.object({ minimum_tasks: z.number().int().positive(), minimum_success_rate: ratio,
    maximum_cost_per_accepted_task_usd: finite.nonnegative(), maximum_latency_ms: finite.positive(),
    evidence_max_age_days: finite.positive(), maximum_failure_rates: z.record(id, ratio) }).strict(),
  promotion: z.object({ minimum_paired_tasks: z.number().int().positive(), alpha: finite.gt(0).lt(1),
    superiority_margin: ratio, maximum_cost_increase: finite.nonnegative(),
    non_inferiority_margin: ratio, minimum_cost_improvement: ratio }).strict(),
  binding: z.object({ refresh_after_hours: finite.positive(), hard_expiry_hours: finite.positive() }).strict(),
}).strict().superRefine((p, ctx) => {
  for (const [name, values] of [['roles', p.roles.map(r => r.role_id)], ['task_classes', p.task_classes.map(c => c.task_class_id)]] as const) {
    if (new Set(values).size !== values.length) ctx.addIssue({ code: 'custom', path: [name], message: 'duplicate policy identity' });
  }
  const classes = new Set(p.task_classes.map(c => c.task_class_id));
  if (p.roles.some(r => r.task_class_ids.some(c => !classes.has(c)))) ctx.addIssue({code:'custom',path:['roles'],message:'role references unknown task class'});
  if (p.binding.refresh_after_hours >= p.binding.hard_expiry_hours) ctx.addIssue({code:'custom',path:['binding'],message:'hard expiry must follow refresh'});
  if (!p.review.critical.required || !p.review.critical.different_family || !p.review.critical.fresh_context || !p.review.critical.frontier) ctx.addIssue({code:'custom',path:['review','critical'],message:'critical review requires fresh independent frontier reviewer'});
});
export type Policy = z.infer<typeof policySchema>;
export function parsePolicy(value: unknown): Policy { return policySchema.parse(value); }
export function loadPolicy(path: string): Policy { return parsePolicy(parse(readFileSync(path, 'utf8'))); }
export function policyDigest(policy: Policy): string { return digest(parsePolicy(policy)); }
