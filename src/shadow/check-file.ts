import {createHash} from 'node:crypto';
import {readFileSync,realpathSync,lstatSync} from 'node:fs';
import {isAbsolute,relative,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
/** Trusted read-only assertion: no source evaluation, shell, network or writes. */
export function checkFile(path:string,expected:string):boolean {
 if(!path||isAbsolute(path)||path.split('/').some(part=>part==='..'||part==='.')||!/^sha256:[a-f0-9]{64}$/.test(expected))throw new Error('unsafe_file_check');
 const root=realpathSync(process.cwd()),absolute=resolve(root,path),local=relative(root,realpathSync(absolute));
 if(local==='..'||local.startsWith('../')||isAbsolute(local)||!lstatSync(absolute).isFile())throw new Error('unsafe_file_check');
 return `sha256:${createHash('sha256').update(readFileSync(absolute)).digest('hex')}`===expected;
}
if(process.argv[1]&&realpathSync(process.argv[1])===fileURLToPath(import.meta.url)){
 const [path,expected,...extra]=process.argv.slice(2);if(!path||!expected||extra.length||!checkFile(path,expected))process.exitCode=1;
}
