import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {parse} from 'yaml';
const root=resolve(import.meta.dirname,'../..');
for(const name of ['delegate','refresh-models']){
 const file=resolve(root,'skills',name,'SKILL.md'),source=readFileSync(file,'utf8'),match=/^---\n([\s\S]+?)\n---\n/.exec(source);assert.ok(match);
 const metadata=parse(match[1]);assert.deepEqual(Object.keys(metadata).sort(),['description','name']);assert.equal(metadata.name,name);assert.ok(metadata.description.length>30);assert.ok(!/TODO|\[INSERT|\[TODO/.test(source));
}
for(const path of ['.claude/skills','.codex/skills','.agents/skills'])assert.equal(existsSync(resolve(root,path)),false,'Library source must stay inert in this checkout.');
assert.ok(existsSync(resolve(root,'docs/usage-cli.md')));
const help=spawnSync(process.execPath,[resolve(root,'dist/cli/index.js'),'help'],{encoding:'utf8',cwd:root,timeout:10000});assert.equal(help.status,0);
for(const command of ['delegate','plan-delegate','refresh','refresh-apply','evaluate','render','shadow'])assert.match(help.stdout,new RegExp(`\\b${command}\\b`));
console.log(JSON.stringify({schema_version:'portable_skills_check.v1',status:'passed',skills:['delegate','refresh-models'],inert:true,cli_entrypoints_verified:true}));
