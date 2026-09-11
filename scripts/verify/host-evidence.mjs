import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createWriteStream } from 'node:fs';
import { StringDecoder } from 'node:string_decoder';
import { finished } from 'node:stream/promises';

// Maintainer-only native CLI experiment; deliberately grants no qualification.
const output = resolve('artifacts/portable-host-evidence');
const modelRuns = {
  codex: { worker: ['gpt-5.3-codex-spark', 'low'], reviewer: ['gpt-5.5', 'high'] },
  'codex-standard': { worker: ['gpt-5.5', 'low'], reviewer: ['gpt-5.5', 'high'] },
  claude: { worker: ['claude-sonnet-5', 'low'], reviewer: ['claude-opus-5', 'high'] },
  'claude-haiku': { worker: ['claude-haiku-4-5-20251001', null], reviewer: ['claude-opus-5', 'high'] },
};
const hash = value => createHash('sha256').update(value).digest('hex');
export async function execute(binary, args, cwd, prompt, destination, timeoutMs = 120000, {env=process.env} = {}) {
  await mkdir(destination, { recursive: true });
  const start=Date.now();
  await writeFile(join(destination, 'request.json'), JSON.stringify({ binary, args, cwd, prompt, started_at: new Date(start).toISOString() }, null, 2));
  return new Promise((resolveRun,rejectRun) => {
    const child = spawn(binary, args, { cwd, env, stdio: ['pipe', 'pipe', 'pipe'], detached: process.platform !== 'win32' });
    const liveOut=createWriteStream(join(destination,'stdout.live.jsonl'));
    const liveErr=createWriteStream(join(destination,'stderr.live.log'));
    const chunks=[],decoder=new StringDecoder('utf8'),timedOutStream=createWriteStream(join(destination,'stdout.timed.jsonl'));
    const stampLine=(at,line)=>timedOutStream.write(JSON.stringify({at,line})+'\n');
    let pending='',stderr='',timedOut=false;
    const stamp=(text,at)=>{pending+=text;let end;while((end=pending.indexOf('\n'))!==-1){stampLine(at,pending.slice(0,end));pending=pending.slice(end+1);}};
    child.stdout.on('data', chunk => {chunks.push(chunk);liveOut.write(chunk);stamp(decoder.write(chunk),new Date().toISOString());});
    child.stderr.on('data', chunk => {stderr += chunk;liveErr.write(chunk);});
    child.stdin.on('error',error=>{if(error.code!=='EPIPE')stderr+=String(error);});
    child.stdin.end(prompt);
    let force;
    const stop = signal => {
      if(child.pid===undefined)return 'complete';
      try {
        if(process.platform==='win32'){child.kill(signal);return 'complete';}
        process.kill(-child.pid,signal);return 'pending';
      } catch(error) { return error?.code==='ESRCH'?'complete':error?.code==='EPERM'?'pending':'failed'; }
    };
    const timeout = setTimeout(() => { timedOut = true; stop('SIGTERM'); force = setTimeout(() => stop('SIGKILL'), 1000); }, timeoutMs);
    child.once('error', error => { stderr += String(error); });
    child.once('close', async (code, signal) => {
      try {
      clearTimeout(timeout);
      clearTimeout(force);
      // The leader may close its pipes while same-group workers are still running.
      // Match runProcess's 2s EPERM settling bound; never advance with unresolved cleanup.
      const cleanupDeadline=Date.now()+2000;
      let cleanup=stop('SIGKILL');
      while(cleanup==='pending'&&Date.now()<cleanupDeadline){
        await new Promise(resolve=>setTimeout(resolve,25));
        cleanup=stop('SIGKILL');
      }
      if(cleanup==='pending')cleanup='failed';
      const completedAt=new Date().toISOString();
      stamp(decoder.end(),completedAt);if(pending)stampLine(completedAt,pending);
      timedOutStream.end();await finished(timedOutStream);
      const bytes=Buffer.concat(chunks),stdout=bytes.toString('utf8');
      liveOut.end();liveErr.end();
      await writeFile(join(destination, 'stdout.jsonl'), bytes);
      await writeFile(join(destination, 'stderr.log'), stderr);
      const events = stdout.split('\n').filter(Boolean).flatMap(line => { try { return [JSON.parse(line)]; } catch { return []; } });
      const result = events.findLast(event => event.type === 'result');
      const completed = events.findLast(event => event.type === 'turn.completed');
      const summary = { code, signal, timed_out: timedOut, cleanup, started_at:new Date(start).toISOString(),completed_at:completedAt,duration_ms: Date.parse(completedAt) - start, stdout_sha256: hash(bytes), stderr_sha256: hash(stderr),
        observed_models: [...new Set(events.filter(e=>e.type==='assistant'&&!e.is_error&&!e.is_api_error_message&&!e.error).map(e=>e.message?.model).filter(model=>typeof model==='string'&&!/^(synthetic|error|unknown|unavailable|undefined|null|none|placeholder|n\/a)$/i.test(model)&&/^[a-z0-9][a-z0-9._:/@-]*$/i.test(model)))],
        observed_effort: null, usage: result?.usage ?? completed?.usage ?? null, client_estimated_cost_usd: result?.total_cost_usd ?? null,
        model_usage: result?.modelUsage ?? null, qualification_authority: false };
      await writeFile(join(destination, 'summary.json'), JSON.stringify(summary, null, 2));
      if(cleanup!=='complete')throw Error('PROCESS_GROUP_CLEANUP_FAILED');
      resolveRun(summary);
      }catch(error){rejectRun(error);}
    });
  });
}
export async function validateSmokeCapture(workerCapture,host,budgetFile){
  if(!modelRuns[host])throw Error('INVALID_SMOKE_HOST');
  const captured=JSON.parse(await readFile(join(workerCapture,'case.json'),'utf8'));
  const directory=captured.directory,[workerModel,workerEffort]=modelRuns[host].worker;
  const {readBudget}=await import('./campaign-budget.mjs');
  const source=join(workerCapture,'worker');
  const evidence=JSON.parse(await readFile(join(source,'identity-evidence.json'),'utf8'));
  const request=JSON.parse(await readFile(join(source,'request.json'),'utf8'));
  const summary=JSON.parse(await readFile(join(source,'summary.json'),'utf8'));
  const accounting=JSON.parse(await readFile(join(source,'accounting.json'),'utf8'));
  const entry=(await readBudget(budgetFile)).entries.find(e=>e.id===accounting.id);
  if(!entry||entry.status!=='completed'||resolve(entry.source)!==resolve(source,'accounting.json')||entry.executions!==1||entry.uncertain||entry.providerLimit)throw Error('CAPTURE_BUDGET_MISMATCH');
  if(captured.case_id!=='positive'||evidence.candidate.model_id!==workerModel||evidence.candidate.effort!==(workerEffort??'not_applicable')||request.cwd!==directory||summary.code!==0||summary.timed_out||hash(await readFile(join(source,'stdout.jsonl')))!==summary.stdout_sha256)throw Error('CAPTURE_WORKER_MISMATCH');
  for(const file of ['quantity.mjs','quantity.test.mjs'])if(captured.files_before[file]!==captured.files_after[file]||await readFile(join(directory,file),'utf8')!==captured.files_before[file])throw Error('CAPTURE_ARTIFACT_MISMATCH');
  return {captured,source,request,summary,entry};
}
export async function runSmoke(host,{budgetFile,outputDirectory=null,workerCapture=null}={}) {
  if(!modelRuns[host])throw Error('INVALID_SMOKE_HOST');
  if(!budgetFile)throw Error('APPROVED_BUDGET_REQUIRED');
  const {reserveBudget,settleBudget}=await import('./campaign-budget.mjs');
  const {sanitizedChildEnvironment}=await import('./direct-vs-delegated.mjs');
  const native=await import('../../dist/runtime/native.js');
  const {parseNativeTelemetry}=await import('../../dist/runtime/telemetry.js');
  const {executionLedger}=await import('./trace-ledger.mjs');
  const {classifyTrial}=await import('./installed-delegate.mjs');
  const binary=host.startsWith('claude')?'claude':'codex';
  const environment=sanitizedChildEnvironment(native,binary);
  const captured=workerCapture?JSON.parse(await readFile(join(workerCapture,'case.json'),'utf8')):null;
  const directory=captured?.directory??await mkdtemp(join(tmpdir(), `delegate-${host}-native-`));
  const runId=`renewal-smoke-${host}-${Date.now()}`;
  const artifacts=outputDirectory??join(output,runId);
  await mkdir(resolve(artifacts,'..'),{recursive:true});await mkdir(artifacts);
  const version=spawnSync(binary,['--version'],{encoding:'utf8',env:environment.env,timeout:15000});
  const hostVersion=version.status===0?version.stdout.trim():'unknown';
  await writeFile(join(artifacts,'host-version.txt'),version.stdout??'');
  const modelExecute=async(args,prompt,role)=>{
    const destination=join(artifacts,role),id=`${runId}-${role}`;
    await reserveBudget(budgetFile,{id,host:binary,purpose:'renewal_smoke',worstCase:1});
    let summary;
    try{summary=await execute(binary,args,directory,prompt+' Do not delegate or start child model processes.',destination,120000,{env:environment.env});}
    catch(error){await settleBudget(budgetFile,id,{source:destination,uncertain:true});throw error;}
    const stdout=await readFile(join(destination,'stdout.jsonl'),'utf8'),stderr=await readFile(join(destination,'stderr.log'),'utf8');
    const telemetry=parseNativeTelemetry(binary==='claude'?'anthropic':'openai',stdout,args[args.indexOf(binary==='claude'?'--model':'-m')+1]);
    const ledger=executionLedger(binary,await readFile(join(destination,'stdout.timed.jsonl'),'utf8'),{startedAt:summary.started_at,endedAt:summary.completed_at});
    const acceptance=classifyTrial({host:binary,stdout,stderr,telemetry});
    await settleBudget(budgetFile,id,{executions:ledger.executions,source:join(destination,'summary.json'),providerLimit:acceptance==='blocked_provider_limit',uncertain:ledger.limitations.some(s=>/count may be incomplete/.test(s))});
    const result={...summary,host_version:hostVersion,telemetry,ledger,environment:environment.identity,environment_override_names:environment.overrideNames};
    await writeFile(join(destination,'accounted.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
    if(acceptance==='blocked_provider_limit')throw Error('HOST_STOPPED');
    return result;
  };
  if(!captured){
  await writeFile(join(directory, 'quantity.mjs'), 'export const totalQuantity = items => items.reduce((sum, item) => sum + (item.quantity || 1), 0);\n');
  await writeFile(join(directory, 'quantity.test.mjs'), `import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport {totalQuantity} from './quantity.mjs';\ntest('preserves zero and defaults only absent quantities', () => {\n assert.equal(totalQuantity([{quantity:0},{quantity:2},{}]),3);\n assert.equal(totalQuantity([{quantity:null},{quantity:undefined}]),2);\n assert.equal(totalQuantity([]),0);\n});\n`);
  await writeFile(join(directory, 'AGENTS.md'), 'This is a disposable bounded fixture. Modify only quantity.mjs. Do not install, access the network, change configuration, or edit tests. Run node --test quantity.test.mjs.\n');
  }
  const prompt = 'Fix totalQuantity in quantity.mjs so explicit zero is preserved and only null/undefined quantities default to one. Do not edit tests or other files. Read the existing files, implement the smallest fix, run node --test quantity.test.mjs, and report the change and result.';
  const args = (model, effort, review = false) => host.startsWith('codex')
    ? ['exec', '--ignore-user-config', '--ignore-rules', '--ephemeral', '--skip-git-repo-check', '-C', directory, '-s', review ? 'read-only' : 'workspace-write', '-m', model, '-c', `model_reasoning_effort="${effort}"`, '--json', '-']
    : ['-p', '--model', model, ...(effort ? ['--effort', effort] : []), '--output-format', 'stream-json', '--verbose', '--no-session-persistence', '--setting-sources', '', '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}', '--permission-mode', 'dontAsk', '--tools', review ? 'Read,Bash' : 'Read,Edit,Write,Bash', '--allowedTools', review ? 'Read,Bash(node --test *)' : 'Read,Edit,Write,Bash(node --test *)', '--max-budget-usd', '2'];
  const [workerModel, workerEffort] = modelRuns[host].worker;
  const originalTests=await readFile(join(directory,'quantity.test.mjs'));
  let worker;
  if(captured){
    const {source,request,summary,entry}=await validateSmokeCapture(workerCapture,host,budgetFile);
    await cp(source,join(artifacts,'worker'),{recursive:true,errorOnExist:true,force:false});
    worker={...summary,started_at:request.started_at,host_version:(await readFile(join(source,'host-version.txt'),'utf8')).trim(),reused_execution_id:entry.id,source_capture:resolve(source)};
  }else worker=await modelExecute(args(workerModel,workerEffort),prompt,'worker');
  if(!originalTests.equals(await readFile(join(directory,'quantity.test.mjs'))))throw Error('SMOKE_WORKER_MUTATED_TESTS');
  const code = await readFile(join(directory, 'quantity.mjs'), 'utf8');
  const objective = await execute(process.execPath, ['--test', 'quantity.test.mjs'], directory, '', join(artifacts, 'objective'));
  let reviewer = null;
  if (objective.code === 0) {
    const [model, effort] = modelRuns[host].reviewer;
    reviewer = await modelExecute(args(model, effort, true),
      'Independently review quantity.mjs against this requirement: sum supplied quantities, preserve explicit zero, default only null/undefined quantities to one, empty input gives zero. Read actual code and tests, run node --test quantity.test.mjs. Do not edit. Return ACCEPT if correct or REPAIR with a concrete defect. This is a fresh review process; do not rely on a worker report.', 'reviewer');
  }
  const afterReview=await readFile(join(directory,'quantity.mjs'),'utf8');
  await writeFile(join(artifacts,'quantity.mjs'),afterReview,{flag:'wx'});
  await writeFile(join(artifacts,'quantity.test.mjs'),await readFile(join(directory,'quantity.test.mjs')),{flag:'wx'});
  if(afterReview!==code||!originalTests.equals(await readFile(join(directory,'quantity.test.mjs'))))throw Error('SMOKE_REVIEW_MUTATED_ARTIFACT');
  const result = { id:runId,artifact_before_review_digest:'sha256:'+hash(code),artifact_after_review_digest:'sha256:'+hash(afterReview),host, scope:'tinybug: zero/nullish quantity default only', directory, artifacts, treatments: modelRuns[host], artifact_sha256: hash(code), artifact: code, worker, objective, reviewer, qualification_authority: false };
  await writeFile(join(artifacts, 'result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
  return result;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const {parseArgs}=await import('node:util');
  const {values}=parseArgs({options:{host:{type:'string',multiple:true},budget:{type:'string'}}});
  for(const host of values.host??Object.keys(modelRuns))await runSmoke(host,{budgetFile:values.budget});
}
