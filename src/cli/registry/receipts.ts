import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {z} from 'zod';
import {jsonCommand} from '../json-command.js';
import {captureReceipt,assessReceipt} from '../../ledger/receipts.js';

export const commands=[
 jsonCommand('receipt-ingest','Archive an original delegate receipt by task class; unassessed receipts grant no qualification.',async(input,cwd)=>{
  const r=z.object({directory:z.string().min(1),receiptFile:z.string().min(1),context:z.unknown()}).strict().parse(input);
  return captureReceipt({directory:resolve(cwd,r.directory),receiptFile:resolve(cwd,r.receiptFile),context:r.context});
 }),
 jsonCommand('receipt-assess','Validate native task, attempt and independent review evidence; append an observation for refresh.',async(input,cwd)=>{
  const r=z.object({directory:z.string().min(1),recordId:z.string().min(1),evidenceFile:z.string().min(1)}).strict().parse(input);
  return assessReceipt({directory:resolve(cwd,r.directory),recordId:r.recordId,evidence:JSON.parse(await readFile(resolve(cwd,r.evidenceFile),'utf8'))});
 }),
];
