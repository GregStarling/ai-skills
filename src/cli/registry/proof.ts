import { z } from 'zod';
import { jsonCommand } from '../json-command.js';
import { verifyProofReport } from '../../proof/index.js';
const requestSchema=z.object({report:z.unknown(),requiredCoverage:z.array(z.string()).default([])}).strict();
export const commands=[jsonCommand('verify-proof','Verify executed check receipts, artifacts and required coverage.', async input=>{
  const request=requestSchema.parse(input);
  return verifyProofReport(request.report,{requiredCoverage:request.requiredCoverage});
},result=>(result as {passed:boolean}).passed?0:1)];
