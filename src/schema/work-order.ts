import {isAbsolute} from 'node:path';
import {z} from 'zod';
export function safePath(value: string): string {
  if (!value || value.includes('\0') || value.includes('\\') || isAbsolute(value) || value.split('/').some(part => part === '.' || part === '..' || part === '')) throw new Error(`unsafe_path: ${value}`);
  return value;
}
const pathSchema = z.string().min(1).refine(value => {try {safePath(value.endsWith('/**') ? value.slice(0,-3) : value);return !value.replace(/\/\*\*$/, '').includes('*');}catch{return false;}}, 'Use exact relative paths or directory/**');
export const workOrderSchema = z.object({
  schema_version: z.literal('work_order.v1'), task_id:z.string().min(1), goal:z.string().min(1),
  role_id:z.string().min(1), task_class_id:z.string().min(1),
  allowed_paths:z.array(pathSchema).nonempty(), forbidden_paths:z.array(pathSchema),
  acceptance_criteria:z.array(z.string().min(1)).nonempty(),
  checks:z.array(z.object({check_id:z.string().min(1),executable:z.string().min(1),args:z.array(z.string()),timeout_ms:z.number().int().positive()}).strict()).nonempty(),
  pre_signals:z.array(z.string()), protected_paths:z.array(z.object({path:pathSchema,signal:z.string().min(1)}).strict()),
  risk_constraints:z.array(z.string().min(1)).nonempty(), escalation_conditions:z.array(z.string().min(1)).nonempty(),
  max_attempts:z.number().int().positive(), timeout_ms:z.number().int().positive(),
  return_format:z.literal('worker_result.v1'),
}).strict().superRefine((order,ctx)=>{
  if(new Set(order.checks.map(check=>check.check_id)).size!==order.checks.length)ctx.addIssue({code:'custom',path:['checks'],message:'duplicate check id'});
});
export type WorkOrder = z.infer<typeof workOrderSchema>;
