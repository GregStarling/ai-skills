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
export function dispatchAssignment(input: Record<string, any>): any;
export type OrdinaryCoordinator = {model:string;effort:string|null};
export type OrdinarySignals = {delegation_requested?:boolean;conflicting_evidence?:boolean;architecture?:boolean;consequential_action?:boolean;capability_failure?:boolean;no_progress_attempts?:number;repair_attempts?:number;host_available?:boolean;permission_granted?:boolean;limit_available?:boolean};
export type WorkType='planning'|'architecture'|'critical_ui_ux'|'accessibility_decision'|'hard_bug'|'concurrency_bug'|'security_decision'|'data_migration_design'|'public_contract_design'|'conflicting_evidence'|'incident_diagnosis'|'consequential_decision'|'performance_diagnosis'|'approved_execution'|'routine_implementation'|'routine_fix'|'mechanical_edit'|'source_lookup'|'source_synthesis'|'test_execution'|'regression_test'|'documentation_sync'|'cosmetic_ui'|'format_conversion'|'dependency_inventory'|'research'|'pdf_analysis'|'substantial_refactor'|'other';
export function substantialTask(input:Record<string,unknown>):boolean;
export type OrdinaryDispatchInput = {work_type?:WorkType;fallback_route?:'coordinator'|'frontier'|'worker';routing_reason?:string;host:'codex'|'claude';assignment:string;risk:'low'|'medium'|'high'|'critical';task_id:string;phase?:'execute'|'complete';bounded?:boolean;decision_bounded?:boolean;substantial?:boolean;coordinator:OrdinaryCoordinator;frontier?:OrdinaryCoordinator;cheap_reviewer?:OrdinaryCoordinator;implemented_behavior?:boolean;decision_evidence?:PolicyEvidence;hard_bug_handoff?:HardBugHandoff;user_model_override?:UserModelOverride;signals?:OrdinarySignals;delegation_forbidden?:boolean;workers?:Record<string,OrdinaryCoordinator>;artifact_digest?:string;review?:{verdict:'PASS'|'REPAIR'|'BLOCKED';fresh_context:boolean;model:string;effort:string|null;artifact_digest:string};legacy?:boolean};
export type OrdinaryDispatchOutcome = {outcome:'direct'|'delegate'|'escalate'|'review'|'blocked';gap:string|null;worker:OrdinaryCoordinator|null;verification:{mode:'separate';reviewer:OrdinaryCoordinator;fresh_context:true}|null;audit:{required:boolean;percent:10}};
export type OrdinaryObservationAttempt = {role:'coordinator'|'worker'|'frontier'|'reviewer'|'repair';model:string;effort:string|null;status:'accepted'|'failed'|'blocked'|'rejected';observed_model:string|null};
export type OrdinaryObservationV2 = {schema_version?:'delegate_observation.v2';observation_version?:2;substantial?:boolean;coordinator?:OrdinaryCoordinator|null;escalation?:string|string[]|null;frontier?:OrdinaryCoordinator|null;artifact_digest?:string|null;review?:{verdict:'PASS'|'REPAIR'|'BLOCKED';fresh_context:boolean;model:string;effort:string|null;artifact_digest:string}|null;attempts?:OrdinaryObservationAttempt[];elapsed_ms?:number|null};
export type OrdinaryCompletionResult = {status:'completed';task_id:string;artifact_digest:string;qualification_authority:false};
/** `complete` accepts an accepted v3 observation payload; failures throw rather than reporting completion. */
export function runCommand(command: 'complete', input: OrdinaryObservationV3 & {cwd:string;host:'codex'|'claude';task_id:string;acceptance:'accepted'}, options?: {stateRoot?:string;skillRoot?:string;now?:string;hostCommand?:string}): Promise<OrdinaryCompletionResult>;
export function runCommand(command: string, input: any, options?: {stateRoot?:string;skillRoot?:string;now?:string;hostCommand?:string}): Promise<any>;

export function auditTask(taskId:string):boolean;

export function artifactDigest(cwd:string,files:string[]):Promise<{artifact_digest:string;files:Record<string,string>}>;

export const workRoutes:Readonly<Record<string,string>>;
export function classifyRoute(input:Record<string,any>):{work_type:string;destination:string;rule:string;basis:string;reason?:string};

export type PolicyEvidence={path:string;digest:string};
export type HardBugHandoff={reproduction:PolicyEvidence;root_cause:PolicyEvidence;correction:PolicyEvidence;regression_check:PolicyEvidence};
export type UserModelOverride={scope:'execution'|'review'|'both';model:string;effort:string|null;instruction:string};
export type ReviewRequirement={role:'frontier'|'economy'|'none';required:boolean;reason:string};
export function reviewRequirement(input:Record<string,any>):ReviewRequirement;
export function reviewPolicyInput(input:Record<string,any>):Record<string,any>;
export function verifyPolicyEvidence(cwd:string,references:PolicyEvidence[]):true;
export type OrdinaryObservationV3=Omit<OrdinaryObservationV2,'schema_version'|'observation_version'> & {schema_version?:'delegate_observation.v3';observation_version?:3;work_type:WorkType;implemented_behavior?:boolean;cheap_reviewer?:OrdinaryCoordinator;artifact_files?:string[];check_evidence?:PolicyEvidence[];execution_evidence?:PolicyEvidence[];decision_evidence?:PolicyEvidence;hard_bug_handoff?:HardBugHandoff;user_model_override?:UserModelOverride};
