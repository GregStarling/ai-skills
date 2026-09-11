import {mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';

// Write-once report: named by its own generated_at, opened with 'wx' so an existing file is never overwritten.
export function writeValidationReport(report,directory){
  const stamp=String(report.generated_at).replace(/\.\d+Z$/,'Z').replace(/[-:]/g,'');
  if(!/^\d{8}T\d{6}Z$/.test(stamp))throw new Error(`INVALID_GENERATED_AT: ${report.generated_at}`);
  const path=join(directory,`${stamp}-v5.json`);
  mkdirSync(directory,{recursive:true});
  writeFileSync(path,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  return path;
}
