import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '../..');
const invoke = (...args) => {
  const result = spawnSync(process.execPath, [resolve(root, 'dist/cli/index.js'), ...args], {cwd:root,encoding:'utf8',timeout:30_000});
  assert.ifError(result.error);
  assert.equal(result.signal,null);
  return {exitCode:result.status,result:JSON.parse(result.stdout)};
};
const policy = invoke('validate-policy','policy/constitution.json');
assert.equal(policy.exitCode,0);
assert.equal(policy.result.status,'VALID');
const manifest = JSON.parse(await readFile(resolve(root,'fixtures/bindings/manifest.json'),'utf8'));
assert.ok(Array.isArray(manifest.valid) && manifest.valid.length >= 3, 'At least three valid fixtures must execute');
assert.ok(Array.isArray(manifest.invalid) && manifest.invalid.length >= 10, 'At least ten independent invalid fixtures must execute');
const checks=[];
for(const [kind,entries] of Object.entries(manifest)) {
  if(kind!=='valid' && kind!=='invalid') continue;
  for(const entry of entries) {
    const response=invoke('validate-binding',resolve(root,entry.file));
    assert.equal(response.exitCode,kind==='valid'?0:2,JSON.stringify(response));
    assert.equal(response.result.status,kind==='valid'?'VALID':'INVALID',JSON.stringify(response));
    if(kind==='invalid') assert.ok(response.result.diagnostics.some(d=>d.rule_id===entry.expected_rule_id),`${entry.file}: missing ${entry.expected_rule_id}: ${JSON.stringify(response.result)}`);
    checks.push({file:entry.file,status:'passed',observed:response.result.status});
  }
}
console.log(JSON.stringify({schema_version:'foundation_verification.v1',status:'passed',checks},null,2));
