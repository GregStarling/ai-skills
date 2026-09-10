import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const directory=mkdtempSync(join(tmpdir(),'governor-cli-workflow-'));
const envelope=JSON.parse(readFileSync('fixtures/bindings/valid-initial-backend.json','utf8'));
const checks=[];
function invoke(name,input,expected=0,extra=[]){
 const path=join(directory,`${checks.length}-${name}.json`);writeFileSync(path,JSON.stringify(input));
 const result=spawnSync(process.execPath,[resolve('dist/cli/index.js'),name,...extra,'--input',path],{encoding:'utf8',timeout:30000});
 assert.equal(result.error,undefined);assert.equal(result.status,expected,result.stdout+result.stderr);
 const output=JSON.parse(result.stdout);checks.push({command:name,args:extra,status:result.status});return output;
}
for(const provider of ['claude','codex']){
 const rendered=invoke('render',{...envelope,mode:'adapter-test',directory:join(directory,provider)},0,[provider]);
 assert.equal(rendered.status,'RENDERED');assert.equal(rendered.artifact.manifest.mode,'adapter-test');
}
const refreshDirectory=join(directory,'refresh');
const request={selection:envelope.selection,mode:'adapter-test',directory:refreshDirectory,trigger:'Built CLI workflow proof'};
const staged=invoke('refresh',request);assert.equal(staged.staged,true);assert(staged.generation);
const apply={directory:refreshDirectory,generation:staged.generation,mode:'adapter-test'};
assert.equal(invoke('refresh-apply',apply).status,'applied');
assert.equal(invoke('refresh-apply',apply).status,'already_applied');
const activePath=join(refreshDirectory,'active.json');const original=readFileSync(activePath,'utf8');
const held=invoke('refresh',request);assert.equal(held.staged,false);assert.equal(held.outcome,'HOLD');assert.equal(readFileSync(activePath,'utf8'),original);
const proposalPath=join(refreshDirectory,staged.generation,'proposal.json');const proposal=JSON.parse(readFileSync(proposalPath));proposal.trigger='tampered';writeFileSync(proposalPath,JSON.stringify(proposal));
assert.match(invoke('refresh-apply',apply,2).message,/REFRESH_PROPOSAL_TAMPERED/);assert.equal(readFileSync(activePath,'utf8'),original);
// Current policy disables shadow: verify refusal before fixture export or provider launch.
const challengerRoot=join(directory,'must-not-be-created');
const disabled=invoke('shadow',{incumbent:{authority:{...envelope,rendered:{directory:join(directory,'codex'),artifact:{}}},order:{},workspace:directory,ledgerDirectory:join(directory,'ledger')},challenger:{fixtureId:'nonexistent',sourceRepository:directory,workspaceRoot:challengerRoot,outputDirectory:join(directory,'native'),candidate:{},cohortId:'test',roleId:'implementer',risk:'low',constraintsDigest:'sha256:'+'0'.repeat(64),timeoutMs:1000},safety:{network:'disabled',capabilities:['bounded_file_edit'],irreversible:false},runId:'cli-proof'},1);
assert.equal(disabled.reason,'shadow_disabled');assert.equal(existsSync(challengerRoot),false);
console.log(JSON.stringify({schema_version:'cli_workflow_proof.v1',passed:true,mode:'simulation',qualification_authority:false,directory,checks},null,2));
