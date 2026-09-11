export function canonical(value: unknown): string;
export function digest(value: unknown): string;
export function normalizeReceipt(value: unknown): Record<string, any>;
export function folderDigest(directory: string, exclude?: string[]): Promise<string>;
export function projectIdentity(cwd: string, host: string): Promise<{project_id:string;host:string}>;
export function reminderDecision(input: any, prior?: any[]): any;
export type LookupInput = {host:'codex'|'claude';task_class?:string;risk?:'low'|'medium'|'high'|'critical';pack_path?:string;failed_candidate_ids?:string[];host_treatments?:any[];supports_fresh_context?:boolean;coordinator?:{model:string;effort:string|null};localPreferences?:any;cwd?:string;run_id?:string};
export type LookupEntry = {candidate_id:string;candidate_identity:string;model:string;effort:string;serving:{fallback:string};evidence_tier:'qualified'|'provisional';basis:string;expires_at:string};
export type LookupPack = {content_digest:string;refresh_due:boolean;refresh_after:string;expires_at:string};
export type LookupRoute = {pack:LookupPack;route:{stratum_digest:string;shape:string;scope:string|null;review_rule:Record<string,boolean>;tools:string[]}|null;workers:LookupEntry[];reviewers:LookupEntry[];ranking_basis:{worker:string;reviewer:string}|null;limitations:string[];coordinator_may_verify:true|null;coordinator_verify_reason:string|null;host_verified:boolean;host_checks:string[];gap:string|null};
export type LookupCoverage = {pack:LookupPack;host:string;coverage:{low:string[];medium:string[]};gap:null};
/** Pure: reads the pack only; `now` is an option, never read from the input. Returns LookupCoverage when task_class is omitted, else LookupRoute. */
export function lookup(input: LookupInput | Record<string, any>, options?: {skillRoot?:string;now?:string}): Promise<any>;
export function routeAssignment(input: Record<string, any>, options?: {stateRoot?:string;skillRoot?:string;now?:string}): Promise<any>;
export function runCommand(command: string, input: any, options?: {stateRoot?:string;skillRoot?:string;now?:string;hostCommand?:string}): Promise<any>;
