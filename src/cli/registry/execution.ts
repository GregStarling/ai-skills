import { resolve } from 'node:path';
import { rm } from 'node:fs/promises';
import { z } from 'zod';
import { jsonCommand } from '../json-command.js';
import type {CliCommand} from '../router.js';
import { renderClaude,renderCodex,writeRendered,runtimeVersions,type RenderedAdapter } from '../../adapters/index.js';
import { parseSelectionInput,loadPolicy } from '../../governance/index.js';
import { parseCandidate,riskCategorySchema } from '../../schema/index.js';
import { prepareFixture,executeEvaluation } from '../../evaluation/index.js';
import { plan,executeDelegate,workerResultSchema,reviewResultSchema,type DelegateAuthority } from '../../delegation/index.js';
import { Ledger } from '../../ledger/index.js';
import { evaluationLedgerEnvelope } from '../../refresh/index.js';
import { createShadowSession, executeShadow } from '../../shadow/index.js';

const authoritySchema=z.object({binding:z.unknown(),selection:z.unknown(),rendered:z.object({directory:z.string(),artifact:z.unknown()}).strict()}).strict();
function authority(value:unknown,cwd:string,policyFile?:string):DelegateAuthority{
 const raw=authoritySchema.parse(value);const selection=parseSelectionInput(raw.selection,{mode:'production',now:new Date().toISOString()});selection.policy=loadPolicy(resolve(cwd,policyFile??'policy/constitution.json'));
 // Rendered content is independently recomputed by the native runner before dispatch.
 return {binding:raw.binding,selection,rendered:{directory:resolve(cwd,raw.rendered.directory),artifact:raw.rendered.artifact as RenderedAdapter}};
}
const delegateSchema=z.object({authority:authoritySchema,reviewer:authoritySchema.optional(),order:z.unknown(),workspace:z.string(),ledgerDirectory:z.string(),policyFile:z.string().optional()}).strict();
const evaluationSchema=z.object({fixtureId:z.string(),sourceRepository:z.string(),workspaceRoot:z.string(),outputDirectory:z.string(),candidate:z.unknown(),cohortId:z.string(),roleId:z.string(),risk:riskCategorySchema,constraintsDigest:z.string(),timeoutMs:z.number().int().positive(),dependencyDirectory:z.string().optional()}).strict();
const renderCommand:CliCommand={name:'render',summary:'Compile a validated binding: render <claude|codex> --input file.',run(args,context){
 const [provider,...rest]=args;if(provider!=='claude'&&provider!=='codex')return {exitCode:2,stderr:'Usage: model-governor render <claude|codex> --input request.json\n'};
 return jsonCommand('render','Render native configuration.',(input,cwd)=>{
  const request=z.object({binding:z.unknown(),selection:z.unknown(),mode:z.enum(['production','adapter-test']),directory:z.string(),policyFile:z.string().optional(),outputSchema:z.record(z.string(),z.unknown()).optional()}).strict().parse(input);
  const selection=parseSelectionInput(request.selection,{mode:request.mode==='production'?'production':'simulation',...(request.mode==='production'?{now:new Date().toISOString()}: {})});
  if(request.mode==='production')selection.policy=loadPolicy(resolve(cwd,request.policyFile??'policy/constitution.json'));
  const candidate=selection.candidates.find(c=>c.candidate_id===(request.binding as {candidate?:{candidate_id?:string}})?.candidate?.candidate_id);
  const outputSchema=request.outputSchema??(candidate?.serving.json_schema?z.toJSONSchema(selection.request.role_id==='reviewer'?reviewResultSchema:workerResultSchema):undefined);
  const options={binding:request.binding,selection,mode:request.mode,runtimeVersion:runtimeVersions[provider==='claude'?'anthropic':'openai'],...(outputSchema?{outputSchema}:{})};
  const artifact=provider==='claude'?renderClaude(options):renderCodex(options);const directory=resolve(cwd,request.directory);writeRendered(directory,artifact);
  return {status:'RENDERED',directory,artifact};
 }).run(rest,context);
}};
export const commands:CliCommand[]=[renderCommand,
 ...(['delegate','plan-delegate'] as const).map(name=>jsonCommand(name,'Execute or inspect a bounded governed work order.',async(input,cwd)=>{
  const request=delegateSchema.parse(input);const options={...authority(request.authority,cwd,request.policyFile),order:request.order,workspace:resolve(cwd,request.workspace),ledgerDirectory:resolve(cwd,request.ledgerDirectory),...(request.reviewer?{reviewer:authority(request.reviewer,cwd,request.policyFile)}:{})};
  return name==='delegate'?executeDelegate(options):plan(options);
 },result=>(result as {outcome?:string}).outcome==='ESCALATION_REQUIRED'?1:0)),
 jsonCommand('evaluate','Run an unqualified native candidate on an isolated harvested fixture.',async(input,cwd)=>{
  const request=evaluationSchema.extend({ledgerDirectory:z.string().optional()}).parse(input);
  const prepared=await prepareFixture({fixtureId:request.fixtureId,sourceRepository:resolve(cwd,request.sourceRepository),workspaceRoot:resolve(cwd,request.workspaceRoot),bundleRoot:resolve(cwd,'fixtures/harvested')});
  const result=await executeEvaluation({prepared,candidate:parseCandidate(request.candidate),timeoutMs:request.timeoutMs,outputDirectory:resolve(cwd,request.outputDirectory),cohortId:request.cohortId,roleId:request.roleId,risk:request.risk,constraintsDigest:request.constraintsDigest,...(request.dependencyDirectory?{dependencyDirectory:resolve(cwd,request.dependencyDirectory)}:{})});
  const entry=await new Ledger(resolve(cwd,request.ledgerDirectory??'artifacts/evaluation-ledger')).append({id:result.observation.observation_id,provenance:{source:prepared.manifest.source_repository_url,observed_at:result.observation.measured_at,methodology:prepared.manifest.harness_version},payload:evaluationLedgerEnvelope(result)});
  return {purpose:result.purpose,observation:result.observation,grader_status:result.grade.status,grader_report:result.grade.reportPath,runtime_report:result.execution.report,operational_limits:result.operationalLimits,ledger_record_id:entry.record.id};
 },result=>(result as {observation:{passed:boolean}}).observation.passed?0:1),
 jsonCommand('shadow','Replay an explicitly enabled, isolated challenger under the governed shadow contract.',async(input,cwd)=>{
  const request=z.object({incumbent:delegateSchema,challenger:evaluationSchema,safety:z.object({network:z.literal('disabled'),capabilities:z.tuple([z.literal('bounded_file_edit')]),irreversible:z.literal(false)}).strict(),runId:z.string().min(1)}).strict().parse(input);
  const incumbent={...authority(request.incumbent.authority,cwd,request.incumbent.policyFile),order:request.incumbent.order,workspace:resolve(cwd,request.incumbent.workspace),ledgerDirectory:resolve(cwd,request.incumbent.ledgerDirectory),...(request.incumbent.reviewer?{reviewer:authority(request.incumbent.reviewer,cwd,request.incumbent.policyFile)}:{})};
  // Refuse disabled traffic before exporting a fixture or invoking a provider.
  if(!incumbent.selection.policy.shadow?.enabled)return {status:'blocked',reason:'shadow_disabled'};
  const candidate=parseCandidate(request.challenger.candidate);
  const prepared=await prepareFixture({fixtureId:request.challenger.fixtureId,sourceRepository:resolve(cwd,request.challenger.sourceRepository),workspaceRoot:resolve(cwd,request.challenger.workspaceRoot),bundleRoot:resolve(cwd,'fixtures/harvested')});
  try{return await executeShadow({incumbent,challenger:{prepared,candidate,timeoutMs:request.challenger.timeoutMs,outputDirectory:resolve(cwd,request.challenger.outputDirectory),cohortId:request.challenger.cohortId,roleId:request.challenger.roleId,risk:request.challenger.risk,constraintsDigest:request.challenger.constraintsDigest,...(request.challenger.dependencyDirectory?{dependencyDirectory:resolve(cwd,request.challenger.dependencyDirectory)}:{})},safety:request.safety,session:createShadowSession(incumbent.selection.policy,request.runId)});}
  finally{await rm(prepared.workspace,{recursive:true,force:true});}
 },result=>(result as {status:string}).status==='completed'?0:1),
];
