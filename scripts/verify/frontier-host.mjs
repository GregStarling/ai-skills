import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {hashBytes,digest} from '../../dist/core/canonical.js';
import {candidateIdentity,parseCandidate,parseRuntimeReport} from '../../dist/schema/index.js';
import {deriveIdentityAssurance,captureIdentityEnvironment} from '../../dist/runtime/identity-assurance.js';
import {parseNativeTelemetry} from '../../dist/runtime/telemetry.js';
import {encodeSources} from '../../dist/evidence/sources.js';
import {runProcess} from '../../dist/runtime/process.js';
import {nativeEnvironment} from '../../dist/runtime/native.js';

/** Capture arguments before execution; derive identity solely from these preserved native sources. */
export async function executeFrontier({target,directory,prompt,destination,timeoutMs=90000,write=false}){
  await mkdir(destination,{recursive:true});
  const execution_environment=target.host==='claude'?'claude_code':'codex';
  const args=target.host==='codex'
    ? ['exec','--ignore-user-config','--ignore-rules','--ephemeral','--skip-git-repo-check','-C',directory,'-s',write?'workspace-write':'read-only','-m',target.model_id,'-c',`model_reasoning_effort="${target.effort}"`,'--json','-']
    : ['-p','--model',target.model_id,...(target.effort==='not_applicable'?[]:['--effort',target.effort]),'--output-format','stream-json','--verbose','--no-session-persistence','--setting-sources','','--strict-mcp-config','--mcp-config','{"mcpServers":{}}','--permission-mode','dontAsk','--tools',write?'Read,Edit,Write,Bash':'Read,Bash','--allowedTools',write?'Read,Edit,Write,Bash':'Read,Bash','--max-budget-usd','2'];
  const candidate=parseCandidate({schema_version:'candidate.v1',candidate_id:`frontier_${target.host}_${target.effort}`,provider:target.provider,model_id:target.model_id,snapshot_id:target.model_id,effort:target.effort,serving:{fallback:'disabled',tool_use:'host_tools',json_schema:false},material_serving_settings:['fallback','tool_use','json_schema'],provenance:{registry_id:'frontier_probe_targets',model_record_id:`frontier_${target.host}`,registry_content_digest:digest(target)}});
  const {env,overrideNames}=nativeEnvironment(target.provider,candidate);
  const version=spawnSync(target.host,['--version'],{encoding:'utf8',timeout:15000,env});
  const versionText=version.stdout??'';
  const command={executable:target.host,args,cwd:directory};
  const controlsText=JSON.stringify({schema_version:'native_environment_controls.v1',sanitizer:'nativeEnvironment',provider:target.provider,override_names:overrideNames},null,2)+'\n';
  const controlsPath=join(destination,'environment-controls.json');
  await writeFile(controlsPath,controlsText);
  const rawRequest=JSON.stringify({schema_version:'native_execution_request.v1',execution_environment,candidate_identity:candidateIdentity(candidate),command,prompt_digest:hashBytes(prompt),environment:captureIdentityEnvironment(env),configuration_files:[{path:controlsPath,content_digest:hashBytes(controlsText)}]},null,2)+'\n';
  await writeFile(join(destination,'native-request.json'),rawRequest);
  await writeFile(join(destination,'host-version.txt'),versionText);
  await writeFile(join(destination,'host-version.stderr.log'),version.stderr??'');
  const actual=await runProcess({executable:target.host,args,cwd:directory,stdin:prompt,outputDirectory:destination,timeoutMs,env});
  const request={binary:target.host,args,cwd:directory,prompt,started_at:actual.started_at};
  await writeFile(join(destination,'request.json'),JSON.stringify(request,null,2)+'\n');
  const summary={code:actual.exit_code,signal:actual.signal,timed_out:actual.timed_out,duration_ms:Date.parse(actual.completed_at)-Date.parse(actual.started_at),stdout_sha256:actual.stdout_digest.replace('sha256:',''),stderr_sha256:actual.stderr_digest.replace('sha256:','')};
  const stdout=await readFile(join(destination,'stdout.jsonl'),'utf8'),stderr=await readFile(join(destination,'stderr.log'),'utf8');
  const completed_at=actual.completed_at;
  const processRecord={schema_version:'native_execution_process.v1',request_digest:hashBytes(rawRequest),started_at:request.started_at,completed_at,exit_code:summary.code,signal:summary.signal,timed_out:summary.timed_out,spawn_error:actual.spawn_error,stdout_digest:hashBytes(stdout),stderr_digest:hashBytes(stderr)};
  const processText=JSON.stringify(processRecord,null,2)+'\n';
  await writeFile(join(destination,'native-process.json'),processText);
  const telemetry=parseNativeTelemetry(target.provider,stdout,target.model_id);
  const report=parseRuntimeReport({schema_version:'runtime_report.v1',report_id:`frontier_${target.host}_${Date.now()}`,provider:target.provider,execution_environment,candidate_id:candidate.candidate_id,started_at:request.started_at,completed_at,command,status:summary.timed_out?'timed_out':summary.code===0&&!telemetry.provider_error?'completed':'failed',exit_code:summary.code,signal:summary.signal,timeout_ms:timeoutMs,stdout_digest:hashBytes(stdout),stderr_digest:hashBytes(stderr),observed_identity:{...(telemetry.observed_model_ids.length===1?{model_id:telemetry.observed_model_ids[0]}:{}),source:telemetry.observed_model_ids.length?'runtime_report':'unknown'},native_evidence:{request_digest:hashBytes(rawRequest),process_digest:hashBytes(processText),version_digest:hashBytes(versionText)}});
  const sources=new Map([rawRequest,processText,versionText,stdout,stderr,prompt,controlsText].map(raw=>[hashBytes(raw),raw]));
  const assurance=deriveIdentityAssurance({candidate,report,sources,executionEnvironment:execution_environment});
  await writeFile(join(destination,'summary.json'),JSON.stringify({...summary,observed_models:telemetry.observed_model_ids,observed_effort:telemetry.observed_efforts[0]??null,qualification_authority:false},null,2)+'\n');
  const evidence={schema_version:'frontier_identity_evidence.v1',candidate,report,sources:encodeSources(sources),assurance};
  await writeFile(join(destination,'identity-evidence.json'),JSON.stringify(evidence,null,2)+'\n');
  return {summary,request,stdout,stderr,telemetry,assurance,evidence,host_version:version.status===0?versionText.trim():'unknown (version command failed)'};
}
