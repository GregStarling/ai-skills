import { resolve } from 'node:path';
import { z } from 'zod';
import { jsonCommand } from '../json-command.js';
import { proposeRefresh,applyRefresh,refreshRequestSchema } from '../../refresh/index.js';
export const commands=[
 jsonCommand('refresh','Stage an explained, independently validated model assignment.',(input,cwd)=>{const request=refreshRequestSchema.parse(input);return proposeRefresh({...request,directory:resolve(cwd,request.directory),...(request.policyFile?{policyFile:resolve(cwd,request.policyFile)}:{})});}),
 jsonCommand('refresh-apply','Explicitly activate a complete validated local generation.',(input,cwd)=>{const request=z.object({directory:z.string(),generation:z.string(),mode:z.enum(['production','adapter-test']),policyFile:z.string().optional()}).strict().parse(input);return applyRefresh({...request,directory:resolve(cwd,request.directory),...(request.policyFile?{policyFile:resolve(cwd,request.policyFile)}:{})});}),
];
