import {afterEach,describe,expect,it} from 'vitest';
import {mkdir,mkdtemp,readFile,rm,symlink,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const assembler=await import(pathToFileURL(resolve('scripts/verify/assemble-evidence.mjs')).href);
const routing=await import('../../src/routing/acceptance.js');
const temporary:string[]=[];
const sha=(value:string|Buffer)=>`sha256:${createHash('sha256').update(value).digest('hex')}`;
const rawSha=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex');
const root=async()=>{const p=await mkdtemp(join(tmpdir(),'assemble-evidence-'));temporary.push(p);return p;};
afterEach(async()=>{await Promise.all(temporary.splice(0).map(p=>rm(p,{recursive:true,force:true})));});

async function fixtures(){
  const dir=await root(),template=join(dir,'host-observations.json'),metadata=join(dir,'metadata.json');
  const real=JSON.parse(await readFile(resolve('data/routing/host-observations.json'),'utf8'));
  await writeFile(template,JSON.stringify({treatments:real.treatments,runs:[]},null,2));
  await writeFile(metadata,JSON.stringify({sources:[{id:'fresh'}],treatments:real.treatments.map((t:any)=>({candidate_id:t.candidate_id,availability:{...t.evidence.availability,checked_at:'2026-09-11T00:00:00.000Z'},pricing:{...t.evidence.pricing,checked_at:'2026-09-11T00:00:00.000Z'}}))},null,2));
  return {dir,template,metadata,treatments:real.treatments};
}
function stdout(model:string,accept=false,session="test"){
  return [
    JSON.stringify({type:'item.completed',item:{id:'read',type:'command_execution',command:'cat quantity.mjs',aggregated_output:'export const totalQuantity = items => items.reduce((sum, item) => sum + (item.quantity ?? 1), 0);',exit_code:0,status:'completed'}}),
    JSON.stringify({type:'item.completed',item:{id:'test',type:'command_execution',command:'node --test quantity.test.mjs',aggregated_output:'ok 1',exit_code:0,status:'completed'}}),
    JSON.stringify({type:'assistant',session_id:session,message:{model,content:[{type:'text',text:accept?'ACCEPT correct':'done'}]}}),
    '',
  ].join('\n');
}
function backendStdout(model:string,failed=false,artifactPath='/tmp/artifacts/paginate.mjs'){
  return [
    JSON.stringify({type:'assistant',message:{model,content:[{type:'tool_use',id:'read_backend',name:'Read',input:{file_path:artifactPath}}]}}),
    JSON.stringify({type:'user',message:{content:[{type:'tool_result',tool_use_id:'read_backend',content:'export const paginate = () => [];',is_error:failed}]}}),
    JSON.stringify({type:'assistant',message:{model,content:[{type:'text',text:'ACCEPT backend artifact inspected'}]}}),
    '',
  ].join('\n');
}
async function smokeRun(parent:string,name:string,host:'codex'|'codex-standard'|'claude'|'claude-haiku',worker:[string,string|null],reviewer:[string,string]){
  const dir=join(parent,name);await mkdir(join(dir,'worker'),{recursive:true});await mkdir(join(dir,'reviewer'),{recursive:true});
  const code='export const totalQuantity = items => items.reduce((sum, item) => sum + (item.quantity ?? 1), 0);\n';
  await writeFile(join(dir,'quantity.mjs'),code);
  const workerOut=stdout(worker[0],false,name),reviewOut=stdout(reviewer[0],true,name);
  await writeFile(join(dir,'worker','stdout.jsonl'),workerOut);await writeFile(join(dir,'reviewer','stdout.jsonl'),reviewOut);
  const request=(model:string,effort:string|null)=>host==='claude'||host==='claude-haiku'?['-p','--model',model,...(effort?['--effort',effort]:[])]:['exec','-m',model,'-c',`model_reasoning_effort="${effort}"`];
  await writeFile(join(dir,'worker','request.json'),JSON.stringify({cwd:dir,started_at:'2026-09-11T00:00:00.000Z',args:request(worker[0],worker[1])}));
  await writeFile(join(dir,'reviewer','request.json'),JSON.stringify({cwd:dir,started_at:'2026-09-11T00:00:02.000Z',args:request(reviewer[0],reviewer[1])}));
  const result={run_id:name,host,scope:'tinybug: zero/nullish quantity default only',treatments:{worker,reviewer},artifact_sha256:rawSha(code),artifact_before_review_digest:sha(code),artifact_after_review_digest:sha(code),worker:{code:0,timed_out:false,started_at:'2026-09-11T00:00:00.000Z',host_version:'test-worker',stdout_sha256:rawSha(workerOut)},objective:{code:0,started_at:'2026-09-11T00:00:01.000Z'},reviewer:{code:0,timed_out:false,started_at:'2026-09-11T00:00:02.000Z',host_version:'test-reviewer',stdout_sha256:rawSha(reviewOut)}};
  const resultPath=join(dir,'result.json');await writeFile(resultPath,JSON.stringify(result,null,2));
  return resultPath;
}
async function smokeInputs(){
  const f=await fixtures();
  const runs=[
    await smokeRun(f.dir,'codex-spark','codex',['gpt-5.3-codex-spark','low'],['gpt-5.5','high']),
    await smokeRun(f.dir,'codex-low','codex',['gpt-5.5','low'],['gpt-5.5','high']),
    await smokeRun(f.dir,'claude-sonnet','claude',['claude-sonnet-5','low'],['claude-opus-5','high']),
    await smokeRun(f.dir,'claude-haiku','claude',['claude-haiku-4-5-20251001',null],['claude-opus-5','high']),
  ];
  return {...f,runs};
}

describe('assemble smoke evidence',()=>{
  it('binds native Read paths through a physical alias of the captured workspace',async()=>{
    const input=await smokeInputs(),path=input.runs[0]!,directory=dirname(path),alias=join(input.dir,'workspace-alias');
    await symlink(directory,alias,'dir');
    const rows=stdout('gpt-5.5',true).trim().split('\n').map(line=>JSON.parse(line));
    rows.splice(0,1,
      {type:'assistant',message:{model:'gpt-5.5',content:[{type:'tool_use',id:'read',name:'Read',input:{file_path:join(alias,'quantity.mjs')}}]}},
      {type:'user',message:{content:[{type:'tool_result',tool_use_id:'read',content:'actual source',is_error:false}]}});
    const raw=rows.map(row=>JSON.stringify(row)).join('\n')+'\n',result=JSON.parse(await readFile(path,'utf8'));
    await writeFile(join(directory,'reviewer/stdout.jsonl'),raw);result.reviewer.stdout_sha256=rawSha(raw);await writeFile(path,JSON.stringify(result));
    await expect(assembler.assembleSmokeEvidence(input)).resolves.toHaveProperty('observations');
  });
  it.each(['shell-wrapper','literal-separators','same-directory','wrong-directory','echoed-check','bold-verdict'])('handles %s without confusing emitted text with inspection',async kind=>{
    const input=await smokeInputs(),path=input.runs[0]!,directory=dirname(path);
    const result=JSON.parse(await readFile(path,'utf8'));
    const rows=stdout('gpt-5.5',true).trim().split('\n').map(line=>JSON.parse(line));
    if(kind==='shell-wrapper')for(const row of rows)if(row.item)row.item.command=`/bin/zsh -lc '${row.item.command}'`;
    if(kind==='literal-separators'){
      rows[0].item.command='ls -la && cat quantity.mjs && echo ---- && cat quantity.test.mjs && echo ---- && node --test quantity.test.mjs';
      rows.splice(1,1);
    }
    if(kind==='same-directory'||kind==='wrong-directory')rows[0].item.command=`cd "${kind==='same-directory'?directory:'/wrong'}" && cat quantity.mjs`;
    if(kind==='echoed-check')rows[1].item.command='echo "node --test quantity.test.mjs"';
    if(kind==='bold-verdict')rows[2].message.content[0].text='**ACCEPT** correct';
    const raw=rows.map(row=>JSON.stringify(row)).join('\n')+'\n';
    await writeFile(join(directory,'reviewer/stdout.jsonl'),raw);
    result.reviewer.stdout_sha256=rawSha(raw);await writeFile(path,JSON.stringify(result));
    const assembled=assembler.assembleSmokeEvidence(input);
    if(['wrong-directory','echoed-check'].includes(kind))await expect(assembled).rejects.toMatchObject({code:'REVIEW_REJECTED'});
    else await expect(assembled).resolves.toHaveProperty('observations');
  });
  it('builds six refreshed treatments, four runs, and a Claude medium audit',async()=>{
    const input=await smokeInputs();
    const result=await assembler.assembleSmokeEvidence(input);
    expect(result.observations.treatments.map((t:any)=>t.candidate_id).sort()).toEqual(input.treatments.map((t:any)=>t.candidate_id).sort());
    expect(result.observations.runs).toHaveLength(4);
    expect(result.observations.treatments.every((t:any)=>t.evidence.observed_effort===null&&t.evidence.effort_source===(t.effort==='not_applicable'?'not_applicable':'requested_configuration'))).toBe(true);
    expect(result.mediumAudit).toMatchObject({schema_version:'medium_smoke_audit.v1',scope:'Zero/nullish quantity-default fixes in local plain JavaScript only.'});
    expect(result.mediumAudit.reviews).toHaveLength(2);
    expect(result.observations.treatments.every((t:any)=>t.evidence.availability.checked_at==='2026-09-11T00:00:00.000Z')).toBe(true);
    expect(()=>routing.buildProvisionalPilotRoutes(result.observations,{schema_version:'installed_delegate_acceptance.v1',validated_at:'2026-09-11T00:00:00.000Z',final_consumer_folder_digest:sha('folder'),host_versions:{codex:'0.1',claude:'2.1'},cases:[]},result.mediumAudit,{now:'2026-09-11T00:00:00.000Z'})).not.toThrow();
  });

  it('rejects tampered stdout, missing review acceptance, and matrix drift',async()=>{
    const input=await smokeInputs();
    const first=input.runs[0]!;
    const parsed=JSON.parse(await readFile(first,'utf8'));parsed.worker.stdout_sha256=rawSha('wrong');await writeFile(first,JSON.stringify(parsed));
    await expect(assembler.assembleSmokeEvidence(input)).rejects.toMatchObject({code:'STDOUT_HASH_MISMATCH'});

    const other=await smokeInputs();
    await writeFile(join(other.dir,'codex-spark','reviewer','stdout.jsonl'),stdout('gpt-5.5',false));
    const otherFirst=other.runs[0]!;
    const parsedOther=JSON.parse(await readFile(otherFirst,'utf8'));parsedOther.reviewer.stdout_sha256=rawSha(stdout('gpt-5.5',false));await writeFile(otherFirst,JSON.stringify(parsedOther));
    await expect(assembler.assembleSmokeEvidence(other)).rejects.toMatchObject({code:'REVIEW_REJECTED'});

    await expect(assembler.assembleSmokeEvidence({...other,runs:other.runs.slice(0,3)})).rejects.toMatchObject({code:'SMOKE_MATRIX_MISMATCH'});

    const changed=await smokeInputs();
    await writeFile(join(changed.dir,'codex-spark','worker','stdout.jsonl'),stdout('gpt-other'));
    const changedFirst=changed.runs[0]!;
    const changedParsed=JSON.parse(await readFile(changedFirst,'utf8'));changedParsed.worker.stdout_sha256=rawSha(stdout('gpt-other'));await writeFile(changedFirst,JSON.stringify(changedParsed));
    await expect(assembler.assembleSmokeEvidence(changed)).rejects.toMatchObject({code:'OBSERVED_MODEL_MISMATCH'});

    const missing=await smokeInputs();
    const missingFirst=missing.runs[0]!;
    const missingParsed=JSON.parse(await readFile(missingFirst,'utf8'));delete missingParsed.artifact_before_review_digest;await writeFile(missingFirst,JSON.stringify(missingParsed));
    await expect(assembler.assembleSmokeEvidence(missing)).rejects.toMatchObject({code:'ARTIFACT_HASH_MISSING'});
  });
});

async function acceptanceResult(){
  const dir=await root(),run=join(dir,'run');await mkdir(join(run,'coordinator'),{recursive:true});await mkdir(join(run,'artifacts'),{recursive:true});
  const artifact='export const paginate = () => [];\n',out=backendStdout('claude-opus-5',false,join(run,'artifacts/paginate.mjs'));
  await writeFile(join(run,'artifacts','paginate.mjs'),artifact);
  await writeFile(join(run,'coordinator','stdout.jsonl'),out);
  const receipt={schema_version:'delegate_receipt.v1',run_id:'case-1'};
  const result={directory:run,fixture_directory:join(run,'artifacts'),run_id:'case-1',host:'claude',name:'backend',acceptance:'pending_frontier_trace_review',execution:{code:0,timed_out:false,started_at:'2026-09-11T00:00:00.000Z',duration_ms:10},after:{passed:true},instructions_unchanged:true,skill_folder_digest:sha('skill'),copied_skill_folder_digest_after:sha('skill'),copied_skill_digest:sha('skill'),artifact_digests:{'paginate.mjs':sha(artifact)},receipts:[{file:'.delegate/runs/receipt.json',run_binding:'matched',sha256:rawSha(JSON.stringify(receipt)),value:receipt}]};
  await mkdir(join(run,'receipts'));await writeFile(join(run,'receipts',rawSha(JSON.stringify(receipt))+'.json'),JSON.stringify(receipt));
  const resultPath=join(run,'result.json');await writeFile(resultPath,JSON.stringify(result,null,2));
  const review={schema_version:'maintainer_trace_review.v1',result_digest:sha(await readFile(resultPath)),stdout_digest:sha(out),author:'maintainer',passed:true,inspection_tool_ids:['read_backend'],workers:[{requested_model:'haiku',requested_effort:null,configured_model_effort:null,observed_message_models:['claude-haiku-4-5-20251001'],observed_written_files:['paginate.mjs']}],frontier:{configuration:{requested_model:'claude-opus-5',requested_effort:'high'},observed_message_models:['claude-opus-5']},browser:null};
  const reviewPath=join(run,'maintainer-review.json');await writeFile(reviewPath,JSON.stringify(review,null,2));
  return {resultPath,reviewPath};
}

describe('assemble acceptance evidence',()=>{
  it('builds accepted rows only from grader result and maintainer trace review',async()=>{
    const row=await acceptanceResult();
    const result=await assembler.assembleAcceptanceEvidence({results:[row],validatedAt:'2026-09-11T00:00:00.000Z',folderDigest:sha('folder'),hostVersions:{codex:'0.1',claude:'2.1'}});
    expect(result).toMatchObject({schema_version:'installed_delegate_acceptance.v1',cases:[{acceptance:'PASS',external_grader_passed:true,recovery:null}]});
    expect(result.cases[0].frontier.actual_artifact_inspected).toBe(true);
  });

  it('rejects failed grader and false maintainer review evidence',async()=>{
    const failed=await acceptanceResult();
    const parsed=JSON.parse(await readFile(failed.resultPath,'utf8'));parsed.after.passed=false;await writeFile(failed.resultPath,JSON.stringify(parsed));
    await expect(assembler.assembleAcceptanceEvidence({results:[failed],validatedAt:'2026-09-11T00:00:00.000Z',folderDigest:sha('folder'),hostVersions:{codex:'0.1',claude:'2.1'}})).rejects.toMatchObject({code:'MAINTAINER_REVIEW_REJECTED'});

    const badReview=await acceptanceResult();
    const review=JSON.parse(await readFile(badReview.reviewPath,'utf8'));review.passed=false;await writeFile(badReview.reviewPath,JSON.stringify(review));
    await expect(assembler.assembleAcceptanceEvidence({results:[badReview],validatedAt:'2026-09-11T00:00:00.000Z',folderDigest:sha('folder'),hostVersions:{codex:'0.1',claude:'2.1'}})).rejects.toMatchObject({code:'MAINTAINER_REVIEW_REJECTED'});
  });

  it('rejects structurally passing results without matched receipt-backed proof',async()=>{
    const pending=await acceptanceResult();
    const parsed=JSON.parse(await readFile(pending.resultPath,'utf8'));parsed.receipts=[{file:'.delegate/runs/repair-output.json',sha256:rawSha(''),error:'invalid_json'}];await writeFile(pending.resultPath,JSON.stringify(parsed));
    const review=JSON.parse(await readFile(pending.reviewPath,'utf8'));review.result_digest=sha(await readFile(pending.resultPath));await writeFile(pending.reviewPath,JSON.stringify(review));
    await expect(assembler.assembleAcceptanceEvidence({results:[pending],validatedAt:'2026-09-11T00:00:00.000Z',folderDigest:sha('folder'),hostVersions:{codex:'0.1',claude:'2.1'}})).rejects.toMatchObject({code:'ACCEPTANCE_REJECTED'});
  });

  it('rejects failed artifact tool results and receipt hash mismatch',async()=>{
    const failed=await acceptanceResult();
    const out=backendStdout('claude-opus-5',true);await writeFile(join(failed.resultPath,'..','coordinator','stdout.jsonl'),out);
    const review=JSON.parse(await readFile(failed.reviewPath,'utf8'));review.stdout_digest=sha(out);await writeFile(failed.reviewPath,JSON.stringify(review));
    await expect(assembler.assembleAcceptanceEvidence({results:[failed],validatedAt:'2026-09-11T00:00:00.000Z',folderDigest:sha('folder'),hostVersions:{codex:'0.1',claude:'2.1'}})).rejects.toMatchObject({code:'MAINTAINER_REVIEW_REJECTED'});

    const mismatch=await acceptanceResult();
    const parsed=JSON.parse(await readFile(mismatch.resultPath,'utf8'));parsed.receipts[0].error='invalid_json';await writeFile(mismatch.resultPath,JSON.stringify(parsed));
    const mismatchReview=JSON.parse(await readFile(mismatch.reviewPath,'utf8'));mismatchReview.result_digest=sha(await readFile(mismatch.resultPath));await writeFile(mismatch.reviewPath,JSON.stringify(mismatchReview));
    await expect(assembler.assembleAcceptanceEvidence({results:[mismatch],validatedAt:'2026-09-11T00:00:00.000Z',folderDigest:sha('folder'),hostVersions:{codex:'0.1',claude:'2.1'}})).rejects.toMatchObject({code:'ACCEPTANCE_REJECTED'});
  });
});


it('rejects mismatched receipt binding even when a maintainer review hashes the edited result',async()=>{
 const row=await acceptanceResult(),result=JSON.parse(await readFile(row.resultPath,'utf8'));
 result.receipts[0].run_binding='mismatch';result.receipts[0].value.run_id='wrong-run';
 await writeFile(row.resultPath,JSON.stringify(result));
 const review=JSON.parse(await readFile(row.reviewPath,'utf8'));review.result_digest=sha(await readFile(row.resultPath));await writeFile(row.reviewPath,JSON.stringify(review));
 await expect(assembler.assembleAcceptanceEvidence({results:[row],validatedAt:'2026-09-11T00:00:00.000Z',folderDigest:sha('folder'),hostVersions:{codex:'0.1',claude:'2.1'}})).rejects.toThrow('ACCEPTANCE_REJECTED');
});

it('rejects a changed raw receipt even when result metadata remains valid',async()=>{
 const row=await acceptanceResult(),result=JSON.parse(await readFile(row.resultPath,'utf8'));
 await writeFile(join(row.resultPath,'..','receipts',result.receipts[0].sha256+'.json'),'{}');
 await expect(assembler.assembleAcceptanceEvidence({results:[row],validatedAt:'2026-09-11T00:00:00.000Z',folderDigest:sha('folder'),hostVersions:{codex:'0.1',claude:'2.1'}})).rejects.toThrow('RECEIPT_HASH_MISMATCH');
});


it('rejects copied reviewer output as a second fresh review',async()=>{
 const input=await smokeInputs(),a=input.runs[2]!,b=input.runs[3]!;
 const bytes=await readFile(join(a,'..','reviewer/stdout.jsonl'));
 await writeFile(join(b,'..','reviewer/stdout.jsonl'),bytes);
 const result=JSON.parse(await readFile(b,'utf8'));result.reviewer.stdout_sha256=rawSha(bytes);await writeFile(b,JSON.stringify(result));
 await expect(assembler.assembleSmokeEvidence(input)).rejects.toThrow('REUSED_REVIEW_EXECUTION');
});

it('imports execution harnesses without launching or requiring a built dist',async()=>{
 const renewal=await import(pathToFileURL(resolve('scripts/verify/renewal-campaign.mjs')).href);
 await expect(renewal.renewalAcceptance('invalid','tinybug')).rejects.toThrow('INVALID_RENEWAL_CASE');
 const smoke=await import(pathToFileURL(resolve('scripts/verify/host-evidence.mjs')).href);
 const probes=await import(pathToFileURL(resolve('scripts/probe-frontiers.mjs')).href);
 const review=await import(pathToFileURL(resolve('scripts/review-frontier-probes.mjs')).href);
 const frontier=await import(pathToFileURL(resolve('scripts/verify/budgeted-frontier.mjs')).href);
 await expect(smoke.runSmoke('claude',{})).rejects.toThrow('APPROVED_BUDGET_REQUIRED');
 await expect(probes.probeFrontiers({})).rejects.toThrow('APPROVED_BUDGET_REQUIRED');
 await expect(review.reviewFrontierProbes('/unused',{})).rejects.toThrow('APPROVED_BUDGET_REQUIRED');
 await expect(frontier.executeBudgetedFrontier({})).rejects.toThrow('APPROVED_BUDGET_REQUIRED');
});

it('rejects wrong smoke scope and same-basename inspection in a different directory',async()=>{
 const input=await smokeInputs(),path=input.runs[0]!;
 const smoke=JSON.parse(await readFile(path,'utf8'));smoke.scope='unrelated';await writeFile(path,JSON.stringify(smoke));
 await expect(assembler.assembleSmokeEvidence(input)).rejects.toThrow('SMOKE_SCOPE_MISMATCH');
 const row=await acceptanceResult(),out=backendStdout('claude-opus-5');
 await writeFile(join(row.resultPath,'../coordinator/stdout.jsonl'),out);
 const review=JSON.parse(await readFile(row.reviewPath,'utf8'));review.stdout_digest=sha(out);await writeFile(row.reviewPath,JSON.stringify(review));
 await expect(assembler.assembleAcceptanceEvidence({results:[row],validatedAt:'2026-09-11T00:00:00.000Z',folderDigest:sha('folder'),hostVersions:{codex:'0.1',claude:'2.1'}})).rejects.toThrow('MAINTAINER_REVIEW_REJECTED');
});

it('reuses only a completed budgeted worker capture with unchanged artifact bytes',async()=>{
 const {validateSmokeCapture}=await import(pathToFileURL(resolve('scripts/verify/host-evidence.mjs')).href);
 const budget=await import(pathToFileURL(resolve('scripts/verify/campaign-budget.mjs')).href);
 const dir=await root(),capture=join(dir,'positive'),worker=join(capture,'worker'),project=join(dir,'project'),budgetFile=join(dir,'budget.json');
 await mkdir(worker,{recursive:true});await mkdir(project);
 const files={'quantity.mjs':'SYNTHETIC CODE','quantity.test.mjs':'SYNTHETIC TESTS'};
 for(const [name,bytes] of Object.entries(files))await writeFile(join(project,name),bytes);
 const json=(path:string,value:unknown)=>writeFile(path,JSON.stringify(value));
 await json(join(capture,'case.json'),{case_id:'positive',directory:project,files_before:files,files_after:files});
 await json(join(worker,'identity-evidence.json'),{candidate:{model_id:'gpt-5.5',effort:'low'}});
 await json(join(worker,'request.json'),{cwd:project});await json(join(worker,'summary.json'),{code:0,timed_out:false,stdout_sha256:rawSha('SYNTHETIC TRACE')});
 await writeFile(join(worker,'stdout.jsonl'),'SYNTHETIC TRACE');await json(join(worker,'accounting.json'),{id:'capture'});
 await budget.initializeBudget(budgetFile,{ceiling:2,authorization:'SYNTHETIC OFFLINE TEST'});
 await budget.reserveBudget(budgetFile,{id:'capture',purpose:'test',host:'codex',worstCase:1});
 await expect(validateSmokeCapture(capture,'codex-standard',budgetFile)).rejects.toThrow('CAPTURE_BUDGET_MISMATCH');
 await budget.settleBudget(budgetFile,'capture',{executions:1,source:join(worker,'accounting.json')});
 await expect(validateSmokeCapture(capture,'codex-standard',budgetFile)).resolves.toMatchObject({entry:{executions:1}});
 expect((await budget.readBudget(budgetFile)).executions).toBe(1);
 await writeFile(join(project,'quantity.mjs'),'CHANGED');
 await expect(validateSmokeCapture(capture,'codex-standard',budgetFile)).rejects.toThrow('CAPTURE_ARTIFACT_MISMATCH');
});
