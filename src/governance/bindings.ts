import { z } from 'zod';
import { bindingSchema, decisionRecordSchema, sharedSchemaVersion, parseBinding, type Binding } from '../schema/index.js';
import { digest, canonicalJson } from '../core/canonical.js';
import { parsePolicy, policyDigest } from './policy.js';
import { select, type SelectionInput } from './selection.js';
import type { Diagnostic } from './risk-review.js';

export function bindingSchemaDigest(): string {
  return digest({ version:sharedSchemaVersion,binding:z.toJSONSchema(bindingSchema),decision:z.toJSONSchema(decisionRecordSchema) });
}
export function createBinding(input: SelectionInput): Binding {
  const result=select(input);
  if (!result.selected) throw new Error(`binding_not_available: ${result.decision.outcome}`);
  const policy=parsePolicy(input.policy);
  const generated=Date.parse(input.now);
  return parseBinding({schema_version:'binding.v1',binding_id:`binding_${digest(result.decision).slice(7,31)}`,
    mode:input.mode,policy_version:policy.policy_version,policy_digest:policyDigest(policy),schema_digest:bindingSchemaDigest(),
    generated_at:input.now,refresh_due_at:new Date(generated+policy.binding.refresh_after_hours*3600000).toISOString(),
    hard_expiry_at:new Date(generated+policy.binding.hard_expiry_hours*3600000).toISOString(),role_id:input.request.role_id,
    task_class_id:input.request.task_class_id,risk:input.request.risk,candidate:result.selected,decision:result.decision,
    evidence_refs:result.decision.evidence_refs,candidate_set_digest:result.decision.candidate_set_digest,
    evidence_digest:result.decision.evidence_digest,production_synthetic_evidence:false});
}
export function validateBinding(value:unknown,input:SelectionInput) {
  const diagnostics:Diagnostic[]=[];
  const fail=(rule_id:string,message:string)=>diagnostics.push({rule_id,message});
  let binding:Binding;
  try {binding=parseBinding(value);} catch(error) {return {ok:false,status:'INVALID' as const,diagnostics:[{rule_id:'binding_schema_invalid',message:error instanceof Error?error.message:'Invalid binding.'}]};}
  const policy=parsePolicy(input.policy);
  const now=Date.parse(input.now);
  if(!Number.isFinite(now)) fail('invalid_validation_time','Validation requires an explicit valid timestamp.');
  if(binding.mode!==input.mode)fail('binding_mode_mismatch','Simulation authority cannot be used as production.');
  if(binding.policy_version!==policy.policy_version || binding.policy_digest!==policyDigest(policy))fail('binding_policy_mismatch','Binding must cite exact current policy.');
  if(binding.schema_digest!==bindingSchemaDigest())fail('binding_schema_digest_mismatch','Binding schema identity differs.');
  if(Date.parse(binding.generated_at)>now)fail('binding_from_future','Binding was generated after validation time.');
  if(now>=Date.parse(binding.hard_expiry_at))fail('binding_expired','Binding reached hard expiry.');
  if(binding.role_id!==input.request.role_id || binding.task_class_id!==input.request.task_class_id || binding.risk!==input.request.risk)fail('binding_request_mismatch','Role, class or risk does not match dispatch.');
  try {
    // Recompute historical decision from the cited raw records, then separately
    // ensure the exact candidate remains eligible at use time. No claimed rule
    // or cached metrics are trusted as inputs to this calculation.
    const expected=createBinding({...input,now:binding.generated_at});
    if(canonicalJson(binding)!==canonicalJson(expected))fail('binding_recomputation_mismatch','Binding differs from independent decision and expiry recomputation.');
    const current=select(input);
    const eligibility=current.qualifications.find(q=>q.candidate_id===binding.candidate.candidate_id);
    if(eligibility?.status!=='QUALIFIED')fail('binding_no_longer_qualified','Candidate no longer meets current evidence and eligibility rules.');
  } catch(error){fail('binding_recomputation_failed',error instanceof Error?error.message:'Cannot reconstruct decision.');}
  const stale=now>=Date.parse(binding.refresh_due_at);
  return {ok:diagnostics.length===0,status:diagnostics.length?'INVALID' as const:stale?'STALE' as const:'VALID' as const,diagnostics};
}
