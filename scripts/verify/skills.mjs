import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {parse} from 'yaml';
const root=resolve(import.meta.dirname,'../..');
for(const name of ['delegate','refresh-models']){
 const file=resolve(root,'skills',name,'SKILL.md'),source=readFileSync(file,'utf8'),match=/^---\n([\s\S]+?)\n---\n/.exec(source);assert.ok(match);
 const metadata=parse(match[1]);assert.deepEqual(Object.keys(metadata).sort(),['description','name']);assert.equal(metadata.name,name);assert.ok(metadata.description.length>30);assert.ok(!/TODO|\[INSERT|\[TODO/.test(source));
}
for(const path of ['.claude/skills','.codex/skills','.agents/skills'])assert.equal(existsSync(resolve(root,path)),false,'Library source must stay inert in this checkout.');
console.log(JSON.stringify({schema_version:'portable_skills_check.v1',status:'passed',skills:['delegate','refresh-models'],inert:true,scope:'source_structure_only',behavioral_validation_required:true}));
