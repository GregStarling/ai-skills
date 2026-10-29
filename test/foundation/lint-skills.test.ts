import {describe,it,expect} from 'vitest';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {lintSkill} from '../../scripts/lint-skills.mjs';

const rules=(folder:string)=>lintSkill(folder).filter(x=>x.level==='FAIL').map(x=>x.rule).sort();
function skill(files:Record<string,string>){
 const folder=mkdtempSync(join(tmpdir(),'lint-skill-'));
 for(const [path,text] of Object.entries(files)){mkdirSync(join(folder,path,'..'),{recursive:true});writeFileSync(join(folder,path),text);}
 return folder;
}
const good='---\nname: good-skill\ndescription: Formats release notes from merged pull requests. Use when the user asks for "release notes for me".\n---\n';

describe('lint-skills',()=>{
 it('passes a well-formed skill with a conditioned reference',()=>{
  const folder=skill({'SKILL.md':`${good}\nBefore writing, read [style](references/style.md).\n`,'references/style.md':'Short.\n'});
  try{expect(rules(folder)).toEqual([]);}finally{rmSync(folder,{recursive:true,force:true});}
 });
 it('flags every structural rule',()=>{
  const long=Array.from({length:120},(_,i)=>`line ${i}`).join('\n');
  const folder=skill({
   'SKILL.md':`---\nname: Bad_claude\ndescription: Use this when you want it.\n---\n${Array.from({length:501},()=>'x').join('\n')}\nFurther reading when relevant: [a](references/a.md).\n`,
   'references/a.md':`${long}\nSee [b](b.md).\n`,'references/b.md':'Orphan.\n'});
  try{expect(rules(folder)).toEqual(['body-length','description-person','description-what','name','name','reference-depth','reference-toc','reference-unnamed','reference-when'].sort());}
  finally{rmSync(folder,{recursive:true,force:true});}
 });
});
