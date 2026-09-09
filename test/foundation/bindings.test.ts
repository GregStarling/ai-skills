import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
import {parseSelectionInput,validateBinding} from '../../src/governance/index.js';
const read=(path:string)=>JSON.parse(readFileSync(path,'utf8'));
const manifest=read('fixtures/bindings/manifest.json') as {valid:{file:string}[];invalid:{file:string;expected_rule_id:string}[]};
describe('independent binding recomputation',()=>{
 it.each(manifest.valid)('accepts $file',({file})=>{const e=read(file);expect(validateBinding(e.binding,parseSelectionInput(e.selection))).toMatchObject({ok:true,status:'VALID'});});
 it.each(manifest.invalid)('rejects $file',({file,expected_rule_id})=>{const e=read(file);const r=validateBinding(e.binding,parseSelectionInput(e.selection));expect(r.ok).toBe(false);expect(r.diagnostics.map(d=>d.rule_id)).toContain(expected_rule_id);});
 it('surfaces soft expiry explicitly without pretending hard expiry',()=>{const e=read(manifest.valid[0]!.file);const input=parseSelectionInput(e.selection,{now:'2026-09-10T01:00:00.000Z'});expect(validateBinding(e.binding,input)).toMatchObject({ok:true,status:'STALE'});});
 it('rejects untyped CLI envelopes and invented metrics',()=>{const e=read(manifest.valid[0]!.file);expect(()=>parseSelectionInput({...e.selection,confidence:.99})).toThrow();expect(()=>parseSelectionInput({...e.selection,now:'yesterday'})).toThrow();});
});
