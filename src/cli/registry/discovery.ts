import { resolve } from 'node:path';
import { jsonCommand } from '../json-command.js';
import { discover,discoveryRequestSchema,enumerateCandidates } from '../../discovery/index.js';
export const commands=[
 jsonCommand('discover','Capture official metadata with source bytes and explicit unknowns.',(input,cwd)=>{const request=discoveryRequestSchema.parse(input);return discover({...request,ledgerDirectory:resolve(cwd,request.ledgerDirectory)});}),
 jsonCommand('enumerate-candidates','Enumerate material treatments from an admitted model registry.',input=>({candidates:enumerateCandidates(input)})),
];
