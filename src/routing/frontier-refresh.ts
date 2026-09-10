import {z} from 'zod';
import {digest} from '../core/canonical.js';

const id=z.string().min(1),iso=z.string().datetime({offset:true}),hash=z.string().regex(/^sha256:[a-f0-9]{64}$/);
const targetSchema=z.object({provider:z.enum(['openai','anthropic']),host:z.enum(['codex','claude']),model_id:id,effort:id,source:z.object({url:z.string().url(),checked_at:iso,content_digest:hash,claim:id}).strict()}).strict().superRefine((t,ctx)=>{
  const url=new URL(t.source.url),domains=t.provider==='openai'?['openai.com','chatgpt.com']:['anthropic.com','claude.com'];
  if(url.protocol!=='https:'||!domains.some(d=>url.hostname===d||url.hostname.endsWith(`.${d}`)))ctx.addIssue({code:'custom',message:'Official provider source required'});
  if(t.host!==(t.provider==='openai'?'codex':'claude'))ctx.addIssue({code:'custom',message:'Provider/host mismatch'});
});
export const frontierTargetsSchema=z.object({schema_version:z.literal('frontier_targets.v1'),discovered_at:iso,targets:z.array(targetSchema).length(2)}).strict().superRefine((x,ctx)=>{
  if(new Set(x.targets.map(t=>t.host)).size!==2)ctx.addIssue({code:'custom',message:'One current frontier per host required'});
});
export const frontierProbesSchema=z.object({schema_version:z.literal('frontier_probes.v1'),targets_digest:hash,probes:z.array(z.object({provider:z.enum(['openai','anthropic']),host:z.enum(['codex','claude']),model_id:id,effort:id,host_version:id,attempted:z.literal(true),attempted_at:iso,availability:z.enum(['available','unavailable','unknown']),reason:id,invocation:z.literal('native_cli'),native_agent_status:z.enum(['not_probed','not_selectable','available']),observed_models:z.array(id),observed_effort:id.nullable(),exit_code:z.number().int().nullable(),timed_out:z.boolean(),stdout_digest:hash,stderr_digest:hash,evaluation:z.object({status:z.enum(['not_run','pending_review','passed','failed']),review_digest:hash.nullable(),note:id}).strict()}).strict())}).strict();
export type FrontierTargets=z.infer<typeof frontierTargetsSchema>;
export type FrontierProbes=z.infer<typeof frontierProbesSchema>;

/** Publication preflight, not model qualification. Discovery remains a maintainer judgment. */
export function requireFrontierRefresh(targetsValue:unknown,probesValue:unknown,now=new Date().toISOString(),maxAgeDays=7){
  const targets=frontierTargetsSchema.parse(targetsValue),probes=frontierProbesSchema.parse(probesValue);
  const current=Date.parse(iso.parse(now));
  if(!Number.isFinite(maxAgeDays)||maxAgeDays<=0)throw Error('INVALID_FRONTIER_REFRESH_AGE');
  const fresh=(date:string)=>Date.parse(date)<=current&&current-Date.parse(date)<=maxAgeDays*86400000;
  if(!fresh(targets.discovered_at)||targets.targets.some(t=>!fresh(t.source.checked_at)))throw Error('FRONTIER_DISCOVERY_STALE_OR_FUTURE');
  if(probes.targets_digest!==digest(targets))throw Error('FRONTIER_TARGETS_CHANGED');
  if(probes.probes.length!==targets.targets.length)throw Error('FRONTIER_PROBE_MISSING_OR_DUPLICATE');
  for(const target of targets.targets){
    const rows=probes.probes.filter(p=>p.host===target.host&&p.provider===target.provider&&p.model_id===target.model_id&&p.effort===target.effort);
    if(rows.length!==1)throw Error('FRONTIER_PROBE_MISSING_OR_DUPLICATE');
    const probe=rows[0]!;
    if(!fresh(probe.attempted_at)||Date.parse(probe.attempted_at)<Date.parse(target.source.checked_at))throw Error('FRONTIER_PROBE_STALE_OR_FUTURE');
    if(probe.availability==='available'){
      if(probe.exit_code!==0||probe.timed_out||!['passed','failed'].includes(probe.evaluation.status)||probe.evaluation.review_digest===null)throw Error('FRONTIER_EVALUATION_REQUIRED');
    }else if(probe.evaluation.status!=='not_run'||probe.evaluation.review_digest!==null)throw Error('FRONTIER_UNAVAILABLE_EVALUATION_CONFLICT');
  }
  return {targets,probes};
}
