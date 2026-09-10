import { z } from 'zod';
import { basename } from 'node:path';
import { canonicalJson, digest, hashBytes } from '../core/canonical.js';
import { candidateIdentity, parseCandidate, parseRuntimeReport, type Candidate, type RuntimeReport, type IdentityAssurance } from '../schema/index.js';
import { parseNativeTelemetry } from './telemetry.js';

const hash=z.string().regex(/^sha256:[a-f0-9]{64}$/), iso=z.string().datetime({offset:true});
export const nativeExecutionRequestSchema=z.object({
  schema_version:z.literal('native_execution_request.v1'),execution_environment:z.enum(['claude_code','codex']),candidate_identity:hash,
  command:z.object({executable:z.string().min(1),args:z.array(z.string()),cwd:z.string().min(1)}).strict(),prompt_digest:hash,
  configuration_files:z.array(z.object({path:z.string().min(1),content_digest:hash}).strict()).optional(),
  environment:z.record(z.string(),z.string().nullable()).optional(),
}).strict();
export const nativeExecutionProcessSchema=z.object({
  schema_version:z.literal('native_execution_process.v1'),request_digest:hash,started_at:iso,completed_at:iso,
  exit_code:z.number().int().nullable(),signal:z.string().nullable(),timed_out:z.boolean(),spawn_error:z.string().nullable(),stdout_digest:hash,stderr_digest:hash,
}).strict();
export type AssuranceDiagnostic={rule_id:string;message:string;hard:boolean};
export type DerivedIdentityAssurance=IdentityAssurance&{diagnostics:AssuranceDiagnostic[]};
const levels=['UNVERIFIED','CONFIGURATION_ATTESTED','PARTIALLY_RUNTIME_ATTESTED','RUNTIME_ATTESTED'] as const;
export const identityAssuranceMeetsMinimum=(actual:IdentityAssurance['overall'],minimum:IdentityAssurance['overall'])=>levels.indexOf(actual)>=levels.indexOf(minimum)&&actual!=='UNVERIFIED';
const object=(value:unknown):Record<string,unknown>|null=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null;
const exactModel=(value:string)=>/^(?:gpt-\d[a-z0-9.-]*|o\d[a-z0-9.-]*|claude-[a-z0-9.-]*\d[a-z0-9.-]*)$/.test(value)&&!/(?:^|[-_.])(latest|default|preview)(?:$|[-_.])/.test(value);
const environmentKeys=['ANTHROPIC_API_KEY','ANTHROPIC_AUTH_TOKEN','ANTHROPIC_BASE_URL','ANTHROPIC_MODEL','ANTHROPIC_SMALL_FAST_MODEL','OPENAI_API_KEY','OPENAI_BASE_URL','OPENAI_API_BASE','CODEX_API_KEY','CODEX_BASE_URL','CLAUDE_CODE_USE_BEDROCK','CLAUDE_CODE_USE_VERTEX','CLAUDE_CODE_USE_FOUNDRY','CLAUDE_CODE_SUBAGENT_MODEL','CLAUDE_CODE_EFFORT_LEVEL','CLAUDE_CODE_SIMPLE','CLAUDE_CODE_SAFE_MODE'];
/** Capture material presence, never credential/endpoint values. Called on the
 * actual child environment before spawn, alongside raw argv capture. */
export function captureIdentityEnvironment(env:NodeJS.ProcessEnv):Record<string,string|null>{
  return Object.fromEntries([...new Set([...environmentKeys,...Object.keys(env).filter(key=>/^ANTHROPIC_DEFAULT_.*_MODEL$/.test(key))])].sort().map(key=>[key,env[key]===undefined?null:['CLAUDE_CODE_SUBAGENT_MODEL','CLAUDE_CODE_EFFORT_LEVEL'].includes(key)?env[key]!:'[present]']));
}

/** Only preserved harness sources establish configuration, never report/receipt labels. */
export function deriveIdentityAssurance(input:{candidate:Candidate;report:RuntimeReport;sources:ReadonlyMap<string,string|Uint8Array>;executionEnvironment?:string}):DerivedIdentityAssurance{
  const candidate=parseCandidate(input.candidate),report=parseRuntimeReport(input.report),diagnostics:AssuranceDiagnostic[]=[],limitations:string[]=[];
  const environment=report.execution_environment??'unknown';
  let model:IdentityAssurance['model']={value:null,assurance:'unverified'},effort:IdentityAssurance['effort']={value:null,assurance:'unverified'};
  const fail=(rule_id:string,message:string,hard=true)=>diagnostics.push({rule_id,message,hard});
  const source=(key:string|undefined):string=>{
    const bytes=key===undefined?undefined:input.sources.get(key);
    if(bytes===undefined||hashBytes(bytes)!==key)throw new Error('Exact native source bytes are missing or changed.');
    return typeof bytes==='string'?bytes:new TextDecoder().decode(bytes);
  };
  const finish=():DerivedIdentityAssurance=>{
    if(diagnostics.length){model={value:null,assurance:'unverified'};effort={value:null,assurance:'unverified'};}
    const overall:IdentityAssurance['overall']=[model,effort].some(f=>f.assurance==='unverified')?'UNVERIFIED':[model,effort].every(f=>['runtime_attested','not_applicable'].includes(f.assurance))?'RUNTIME_ATTESTED':[model,effort].some(f=>f.assurance==='runtime_attested')?'PARTIALLY_RUNTIME_ATTESTED':'CONFIGURATION_ATTESTED';
    return {overall,model,effort,execution_environment:environment,evidence_digest:digest({candidate_identity:candidateIdentity(candidate),report_digest:digest(report),native_evidence:report.native_evidence??null}),limitations,diagnostics};
  };
  if(report.provider!==candidate.provider||report.candidate_id!==candidate.candidate_id)fail('configuration_identity_mismatch','Runtime report belongs to another exact treatment.');
  if(environment==='unknown'||input.executionEnvironment!==undefined&&environment!==input.executionEnvironment)fail('execution_environment_mismatch','Execution environment must match the requested treatment.',environment!=='unknown');
  // Negative evidence survives missing configuration: an incomplete request must
  // never hide a contradiction already exposed by an attributable host trace.
  if(['claude_code','codex'].includes(environment)){
    const observed=report.observed_identity;
    if(observed.model_id!==undefined&&observed.model_id!==candidate.snapshot_id||observed.effort!==undefined&&observed.effort!==candidate.effort)fail('runtime_identity_mismatch','Reported observed identity contradicts the candidate.');
    try{
      const telemetry=parseNativeTelemetry(candidate.provider as 'anthropic'|'openai',source(report.stdout_digest),candidate.model_id);
      if(telemetry.substitution_observed||telemetry.observed_model_ids.some(value=>value!==candidate.snapshot_id)||telemetry.observed_efforts.some(value=>value!==candidate.effort))fail('runtime_identity_mismatch','Preserved runtime evidence contradicts the candidate, regardless of configuration completeness.');
    }catch{/* Missing trace grants no positive authority below. */}
  }
  if(environment==='api'){
    // API reports retain the v4 provider-receipt contract. They never acquire
    // subscription configuration authority and cannot cross the environment gate.
    const observed=report.observed_identity;
    if(observed.source==='unknown'||observed.model_id===undefined||observed.effort===undefined)fail('identity_assurance_insufficient','API identity requires served model and effort.',false);
    else if(observed.model_id!==candidate.snapshot_id||observed.effort!==candidate.effort)fail('runtime_identity_mismatch','API served identity contradicts the candidate.');
    else {model={value:observed.model_id,assurance:'runtime_attested'};effort={value:observed.effort,assurance:'runtime_attested'};}
    return finish();
  }
  try{
    if(environment!=='claude_code'&&environment!=='codex')throw new Error('Native execution environment is absent.');
    const evidence=report.native_evidence;if(!evidence)throw new Error('No independently captured native execution evidence.');
    const request=nativeExecutionRequestSchema.parse(JSON.parse(source(evidence.request_digest)));
    const process=nativeExecutionProcessSchema.parse(JSON.parse(source(evidence.process_digest)));
    const version=source(evidence.version_digest).trim(),stdout=source(report.stdout_digest),stderr=source(report.stderr_digest);
    if(request.execution_environment!==environment)fail('execution_environment_mismatch','Raw host request contradicts the report environment.');
    if(request.candidate_identity!==candidateIdentity(candidate)||canonicalJson(request.command)!==canonicalJson(report.command))fail('configuration_identity_mismatch','Raw request does not bind this exact candidate and invocation.');
    if(!request.environment||environmentKeys.some(key=>!Object.hasOwn(request.environment!,key)))throw new Error('Actual child identity-affecting environment was not captured.');
    for(const [key,value] of Object.entries(request.environment)){
      const expected=key==='CLAUDE_CODE_SUBAGENT_MODEL'?candidate.model_id:key==='CLAUDE_CODE_EFFORT_LEVEL'?candidate.effort:null;
      if(!environmentKeys.includes(key)&&!/^ANTHROPIC_DEFAULT_.*_MODEL$/.test(key)||value!==null&&value!==expected)fail('configuration_identity_mismatch','Captured child environment has an incompatible model, effort or provider override.');
    }
    if(process.request_digest!==evidence.request_digest||process.started_at!==report.started_at||process.completed_at!==report.completed_at||process.stdout_digest!==report.stdout_digest||process.stderr_digest!==report.stderr_digest||process.exit_code!==report.exit_code||process.signal!==report.signal||Date.parse(process.completed_at)<Date.parse(process.started_at))fail('configuration_identity_mismatch','Raw process capture does not bind the request, lifetime and traces.');
    if(process.spawn_error!==null||report.status==='blocked')throw new Error('Host execution was not established.');
    const binary=environment==='codex'?'codex':'claude';
    if(basename(request.command.executable)!==binary||!(environment==='codex'?/^codex-cli \d+\.\d+\.\d+/.test(version):/^\d+\.\d+\.\d+ \(Claude Code\)/.test(version)))throw new Error('Exact native host and version are not established.');
    const args=request.command.args;
    const values=(flags:string[])=>args.flatMap((arg,i)=>flags.includes(arg)?[args[i+1]??'']:flags.some(flag=>arg.startsWith(`${flag}=`))?[arg.slice(arg.indexOf('=')+1)]:[]);
    if(environment==='codex'?!args.includes('--ignore-user-config'):canonicalJson(values(['--setting-sources']))!==canonicalJson(['']))throw new Error('Uncaptured host settings must be excluded from configuration authority.');
    const models=values(['--model','-m']);
    const config=values(['-c','--config']);
    const efforts=environment==='claude_code'?values(['--effort']):config.filter(v=>/^model_reasoning_effort\s*=/.test(v)).map(v=>{try{return JSON.parse(v.slice(v.indexOf('=')+1)) as string;}catch{return '';}});
    if(models.length!==1||!models[0])throw new Error('Exactly one explicit configured model is required.');
    const configuredModel=models[0];
    if(efforts.length>1||efforts.some(v=>typeof v!=='string'))fail('configured_effort_mismatch','Ambiguous effort overrides cannot attest one treatment.');
    const configuredEffort=efforts[0]??null;
    if(candidate.effort==='not_applicable'){
      if(configuredEffort!==null)fail('configured_effort_mismatch','A treatment without an effort control cannot configure one.');
      else effort={value:'not_applicable',assurance:'not_applicable'};
    }else if(configuredEffort===null)throw new Error('Exact configured effort is missing.');
    else if(configuredEffort!==candidate.effort)fail('configured_effort_mismatch','Configured effort differs from the exact candidate.');
    else effort={value:configuredEffort,assurance:'host_configuration'};
    // Configuration files are immutable capture inputs, not mutable paths. CLI
    // overrides are required for identity; profiles/providers/fallback overrides
    // are not admissible in this native contract.
    for(const file of request.configuration_files??[])source(file.content_digest);
    for(const path of [...values(['--settings','--output-schema'])])if(!path.startsWith('{')&&!(request.configuration_files??[]).some(f=>f.path===path))throw new Error('Named configuration file bytes were not captured.');
    for(const settings of values(['--settings'])){
      const file=request.configuration_files?.find(f=>f.path===settings);
      const parsed=object(JSON.parse(file?source(file.content_digest):settings));
      if(!parsed||Object.keys(parsed).some(key=>!['sandbox','permissions'].includes(key)))fail('configuration_identity_mismatch','Unsupported settings may override model, provider, effort or fallback.');
    }
    if(values(['--agent','--agents','--plugin-dir']).length)fail('configuration_identity_mismatch','Unvalidated agent or plugin configuration cannot attest exact native identity.');
    if(args.some(v=>['--profile','-p','--oss','--local-provider','--remote','--resume'].includes(v)&&!(environment==='claude_code'&&v==='-p'))||config.some(v=>/^(?:model|model_provider|model_providers|profile|profiles|model_reasoning_effort\.)\s*(?:\.|=)/.test(v)))fail('configuration_identity_mismatch','Unsupported identity or provider override in native invocation.');
    if(values(['--fallback-model']).length||candidate.serving.fallback!=='disabled')fail('configuration_identity_mismatch','An explicit fallback is incompatible with this exact native treatment.');
    limitations.push('No host fallback was configured; provider-side fallback state is not independently attested.');
    if(candidate.serving.tool_use==='provider_tools')fail('configuration_identity_mismatch','Native host evidence cannot attest provider-tools serving.');
    if(environment==='claude_code'){
      const toolValues=values(['--tools']);
      if(toolValues.length!==1||(candidate.serving.tool_use==='none')!==(toolValues[0]===''))fail('configuration_identity_mismatch','Configured tool mode differs from candidate serving.');
    }else if(candidate.serving.tool_use==='none')fail('configuration_identity_mismatch','Codex does not attest tool suppression in this contract.');
    if(candidate.serving.json_schema!==(values(environment==='claude_code'?['--json-schema']:['--output-schema']).length>0))fail('configuration_identity_mismatch','Configured structured-output mode differs from candidate serving.');
    const telemetry=parseNativeTelemetry(candidate.provider as 'anthropic'|'openai',stdout,configuredModel);
    if(telemetry.malformed_events>0)throw new Error('Malformed native trace cannot establish execution identity.');
    const events=stdout.split(/\r?\n/).filter(line=>line.trim()).map(line=>object(JSON.parse(line))).filter((event):event is Record<string,unknown>=>event!==null);
    const executed=environment==='claude_code'?events.some(e=>e['type']==='assistant'&&!e['is_api_error_message']&&!e['is_error']&&!e['error']):events.some(e=>e['type']==='item.completed'||e['type']==='turn.completed');
    const completed=environment==='claude_code'?events.some(e=>e['type']==='result'&&e['is_error']!==true&&(e['subtype']==='success'||e['terminal_reason']==='completed')):events.some(e=>e['type']==='turn.completed');
    if(!executed||report.status==='completed'&&(!completed||process.exit_code!==0||process.timed_out||telemetry.provider_error))throw new Error('The host did not accept and execute the configured treatment.');
    if(/(?:unsupported|unknown|invalid|unrecognized)\s+(?:model|effort)|does not support this model/i.test(stderr))throw new Error('The host rejected the configured treatment.');
    if(telemetry.substitution_observed)fail('runtime_identity_mismatch','Host trace reports substitution or fallback.');
    const observedModels=telemetry.observed_model_ids;
    if(observedModels.some(value=>value!==candidate.snapshot_id))fail('runtime_identity_mismatch','Served model contradicts the exact candidate.');
    if(telemetry.observed_efforts.some(value=>value!==candidate.effort))fail('runtime_identity_mismatch','Served effort contradicts the exact candidate.');
    if(observedModels.length){
      model={value:observedModels[0]!,assurance:'runtime_attested'};
      if(configuredModel!==candidate.model_id&&configuredModel!==candidate.snapshot_id&&exactModel(configuredModel))fail('configured_model_mismatch','Exact configured model differs from the candidate, despite later telemetry.');
    }else{
      if(!exactModel(configuredModel))throw new Error('Configuration-only aliases cannot establish exact model identity.');
      if(configuredModel!==candidate.model_id||candidate.model_id!==candidate.snapshot_id)fail('configured_model_mismatch','Configuration-only evidence must name the exact canonical treatment identifier.');
      model={value:configuredModel,assurance:'host_configuration'};
      limitations.push('Served model is not independently exposed by this host trace.');
    }
    if(telemetry.observed_efforts.length)effort={value:telemetry.observed_efforts[0]!,assurance:'runtime_attested'};
    else if(candidate.effort!=='not_applicable')limitations.push('Served effort is not independently exposed by this host trace.');
    // Caller-written report fields cannot upgrade assurance. Contradictions are
    // still fatal; discarding them would hide known substitution evidence.
  }catch(error){fail('identity_assurance_insufficient',error instanceof Error?error.message:'Native evidence is not derivable.',false);}
  return finish();
}
