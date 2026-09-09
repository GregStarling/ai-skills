import { resolve } from 'node:path';
import { z } from 'zod';
import { Ledger } from '../../ledger/index.js';
import { jsonCommand } from '../json-command.js';

const directoryInput = z.object({ directory: z.string().min(1) }).strict();
const appendInput = z.object({ directory: z.string().min(1), record: z.object({
  id: z.string().min(1), payload: z.unknown(), provenance: z.object({
    source:z.string().min(1), observed_at:z.iso.datetime({offset:true}), methodology:z.string().min(1),
  }).catchall(z.unknown()),
}).strict() }).strict();
export const commands = [
  jsonCommand('ledger-append', 'Atomically append an immutable observation with provenance.', async (input,cwd) => {
    const request = appendInput.parse(input);
    return new Ledger(resolve(cwd,request.directory)).append({...request.record,payload:request.record.payload});
  }),
  jsonCommand('ledger-status', 'Read and verify every immutable ledger record.', async (input,cwd) => {
    const request = directoryInput.parse(input);
    const records = await new Ledger(resolve(cwd,request.directory)).list();
    return {status:'VALID',records:records.length,entries:records.map(r=>({id:r.id,content_digest:r.content_digest,provenance:r.provenance}))};
  }),
];
