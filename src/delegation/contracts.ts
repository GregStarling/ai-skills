import {z} from 'zod';
import type {SelectionInput} from '../governance/index.js';
import type {RenderedAdapter} from '../adapters/index.js';
import type {WorkOrder, WorkspaceSnapshot} from './scope.js';

export const workerResultSchema=z.object({schema_version:z.literal('worker_result.v1'),outcome:z.enum(['DONE','ESCALATE']),summary:z.string(),files_changed:z.array(z.string()),tests_executed:z.array(z.string()),uncertainties:z.array(z.string())}).strict();
export const reviewResultSchema=z.object({schema_version:z.literal('review_result.v1'),outcome:z.enum(['ACCEPT','REJECT','ESCALATE']),artifact_digest:z.string().regex(/^sha256:[a-f0-9]{64}$/),package_digest:z.string().regex(/^sha256:[a-f0-9]{64}$/),findings:z.array(z.string())}).strict();
export type DelegateAuthority={binding:unknown;selection:SelectionInput;rendered:{directory:string;artifact:RenderedAdapter}};
export type DelegateInput=DelegateAuthority & {order:unknown;workspace:string;ledgerDirectory:string;reviewer?:DelegateAuthority};
export type DelegatePlan={order:WorkOrder;workspace:string;binding_digest:string;baseline:WorkspaceSnapshot;risk:SelectionInput['request']['risk'];mode:'production'|'simulation'};
export type DelegateOutcome={schema_version:'delegate_outcome.v1';task_id:string;run_id:string;mode:'production'|'simulation';outcome:'ACCEPTED'|'ESCALATION_REQUIRED';accepted:boolean;attempts:number;total_cost_usd:number|null;artifact_digest:string|null;changed_paths:string[];risk:SelectionInput['request']['risk'];diagnostics:string[];ledger_refs:string[]};
