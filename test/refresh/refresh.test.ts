import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {describe,it,expect} from 'vitest';
import {proposeRefresh,applyRefresh} from '../../src/refresh/index.js';
import {contentDigest,digest,hashBytes} from '../../src/core/canonical.js';
import {Ledger} from '../../src/ledger/index.js';
const example=async()=>JSON.parse(await readFile('fixtures/bindings/valid-initial-backend.json','utf8')).selection;
describe('composed refresh and atomic activation',()=>{
 it('stages real validated native output, applies once, and HOLD leaves active unchanged',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'governor-refresh-'));
  try{
   const request={selection:await example(),directory,mode:'adapter-test',trigger:'synthetic integration scenario'};
   const staged=await proposeRefresh(request);expect(staged.staged).toBe(true);if(!('generation' in staged))throw new Error(String((staged as {reason?:string}).reason));
   const applied=await applyRefresh({directory,generation:staged.generation,mode:'adapter-test'});expect(applied.status).toBe('applied');
   const before=await readFile(join(directory,'active.json'),'utf8');
   expect((await applyRefresh({directory,generation:staged.generation,mode:'adapter-test'})).status).toBe('already_applied');
   const next=await proposeRefresh(request);expect(next).toMatchObject({outcome:'HOLD',staged:false});expect(await readFile(join(directory,'active.json'),'utf8')).toBe(before);
   await expect(applyRefresh({directory,generation:staged.generation,mode:'production'})).rejects.toThrow('REFRESH_MODE_MISMATCH');
  }finally{await rm(directory,{recursive:true,force:true});}
 });
 it('rejects generated drift before activation and keeps previous active state',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'governor-refresh-'));
  try{
   const staged=await proposeRefresh({selection:await example(),directory,mode:'adapter-test',trigger:'synthetic drift scenario'});if(!('generation' in staged))throw new Error(String((staged as {reason?:string}).reason));
   await writeFile(join(directory,staged.generation,'rendered','unexpected.txt'),'drift');
   await expect(applyRefresh({directory,generation:staged.generation,mode:'adapter-test'})).rejects.toThrow('GENERATED_ARTIFACT_DRIFT');
   await expect(readFile(join(directory,'active.json'))).rejects.toThrow();
  }finally{await rm(directory,{recursive:true,force:true});}
 });
 it('cannot fabricate a production binding from synthetic observations',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'governor-refresh-'));
  try{expect(await proposeRefresh({selection:await example(),directory,mode:'production',trigger:'synthetic attempted production'})).toMatchObject({staged:false,outcome:'HOLD'});}finally{await rm(directory,{recursive:true,force:true});}
 });
 it('repairs an unavailable incumbent only through fresh qualification',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'governor-refresh-'));
  try{
   const selection=await example();const first=await proposeRefresh({selection,directory,mode:'adapter-test',trigger:'initial'});if(!('generation' in first))throw new Error(String((first as {reason?:string}).reason));await applyRefresh({directory,generation:first.generation,mode:'adapter-test'});
   selection.registry.records[0].lifecycle='unavailable';selection.registry.records[0].content_digest=contentDigest(selection.registry.records[0]);selection.registry.content_digest=contentDigest(selection.registry);for(const c of selection.candidates)c.provenance.registry_content_digest=selection.registry.content_digest;
   const repaired=await proposeRefresh({selection,directory,mode:'adapter-test',trigger:'availability changed'});expect(repaired.staged).toBe(true);if(!('binding' in repaired))throw new Error(String((repaired as {reason?:string}).reason));expect(repaired.binding.candidate.candidate_id).toBe('candidate_beta');
  }finally{await rm(directory,{recursive:true,force:true});}
 });
 it('ingests exact raw ledger observations, qualifies, renders and applies with lossless binary sources',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'governor-refresh-ledger-'));
  try{
   const selection=await example(),ledgerDirectory=join(directory,'raw-evaluations'),ledger=new Ledger(ledgerDirectory),ids:string[]=[];
   const rows=selection.observations;selection.observations=[];const binary=Buffer.from([255,0,128,42]),binaryDigest=hashBytes(binary);
   for(const row of rows){
    const sources={...selection.sources};
    if(row===rows[0]){row.provenance.artifact_digest=binaryDigest;row.content_digest=contentDigest(row);sources[binaryDigest]={encoding:'base64',data:binary.toString('base64')};}
    const id=`test_${row.observation_id}`;ids.push(id);
    await ledger.append({id,provenance:{source:'synthetic policy integration fixture',observed_at:selection.now,methodology:'synthetic_ledger_ingestion_test'},payload:{schema_version:'evaluation_ledger_entry.v1',purpose:'qualification_evaluation',observation:row,sources,runtimeReports:{},operationalLimits:['SYNTHETIC_TEST_ONLY']}});
   }
   const request={selection,directory,mode:'adapter-test',trigger:'explicit imported synthetic evidence',evaluationLedgers:[{directory:ledgerDirectory,recordIds:ids}]};
   const staged=await proposeRefresh(request);expect(staged.staged).toBe(true);expect(staged.evaluation_records).toHaveLength(40);expect(staged.qualifications.every(q=>q.status==='QUALIFIED'&&q.metrics.tasks===20)).toBe(true);
   if(!('generation' in staged))throw new Error('Expected qualified staging');
   expect((await applyRefresh({directory,generation:staged.generation,mode:'adapter-test'})).status).toBe('applied');
   const active=await readFile(join(directory,'active.json'),'utf8');const repeat=await proposeRefresh(request);expect(repeat).toMatchObject({outcome:'HOLD',staged:false});expect(await readFile(join(directory,'active.json'),'utf8')).toBe(active);expect(await ledger.list()).toHaveLength(40);
   await expect(proposeRefresh({...request,mode:'production'})).rejects.toThrow('SYNTHETIC_EVALUATION_IN_PRODUCTION');
   const record=await ledger.get(ids[0]!);await writeFile(join(ledgerDirectory,`${digest(ids[0]!).slice(7)}.json`),JSON.stringify({...record,payload:{tampered:true}}));
   await expect(proposeRefresh(request)).rejects.toThrow('Ledger integrity check failed');expect(await readFile(join(directory,'active.json'),'utf8')).toBe(active);
  }finally{await rm(directory,{recursive:true,force:true});}
 });
 it('renews a stale qualified incumbent without replacing it',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'governor-refresh-renew-'));
  try{
   const selection=await example();const first=await proposeRefresh({selection,directory,mode:'adapter-test',trigger:'initial'});if(!('generation' in first))throw new Error('Expected staging');await applyRefresh({directory,generation:first.generation,mode:'adapter-test'});
   const later={...selection,now:new Date(Date.parse(selection.now)+25*3600000).toISOString()};
   const renewal=await proposeRefresh({selection:later,directory,mode:'adapter-test',trigger:'scheduled freshness check'});expect(renewal).toMatchObject({staged:true,incumbent_status:'STALE'});if(!('binding' in renewal))throw new Error('Expected renewal');expect(renewal.binding.candidate.candidate_id).toBe(first.binding.candidate.candidate_id);expect(renewal.binding.generated_at).toBe(later.now);expect(renewal.generation).not.toBe(first.generation);
   expect((await applyRefresh({directory,generation:renewal.generation,mode:'adapter-test'})).status).toBe('applied');
   expect(await proposeRefresh({selection:later,directory,mode:'adapter-test',trigger:'unchanged repeat'})).toMatchObject({outcome:'HOLD',staged:false});
  }finally{await rm(directory,{recursive:true,force:true});}
 });
 it('refuses stale-base and interrupted-lock applies while preserving the complete active generation',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'governor-refresh-conflict-'));
  try{
   const selection=await example(),a=await proposeRefresh({selection,directory,mode:'adapter-test',trigger:'proposal A'}),b=await proposeRefresh({selection,directory,mode:'adapter-test',trigger:'proposal B'});
   if(!('generation' in a)||!('generation' in b))throw new Error('Expected competing proposals');
   await applyRefresh({directory,generation:a.generation,mode:'adapter-test'});const active=await readFile(join(directory,'active.json'),'utf8');
   await expect(applyRefresh({directory,generation:b.generation,mode:'adapter-test'})).rejects.toThrow('REFRESH_ACTIVE_CHANGED');expect(await readFile(join(directory,'active.json'),'utf8')).toBe(active);
   await writeFile(join(directory,'.apply.lock'),'interrupted operator apply');
   await expect(applyRefresh({directory,generation:b.generation,mode:'adapter-test'})).rejects.toThrow(/EEXIST/);expect(await readFile(join(directory,'active.json'),'utf8')).toBe(active);expect(await readFile(join(directory,'.apply.lock'),'utf8')).toBe('interrupted operator apply');
  }finally{await rm(directory,{recursive:true,force:true});}
 });
 it('never runs a model from adapter-test evaluation requests',async()=>{
  const directory=await mkdtemp(join(tmpdir(),'governor-refresh-authorization-'));
  try{await expect(proposeRefresh({selection:await example(),directory,mode:'adapter-test',trigger:'refused synthetic native request',evaluations:[{evaluationId:'explicit_test',candidateId:'candidate_alpha',fixtureId:'unused',sourceRepository:'/nonexistent',workspaceRoot:join(directory,'workspaces'),timeoutMs:1000}]})).rejects.toThrow('LIVE_EVALUATION_REQUIRES_EXPLICIT_PRODUCTION_REQUEST');}finally{await rm(directory,{recursive:true,force:true});}
 });

});
