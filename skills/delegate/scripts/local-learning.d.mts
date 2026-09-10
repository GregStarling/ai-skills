export function canonical(value: unknown): string;
export function digest(value: unknown): string;
export function normalizeReceipt(value: unknown): Record<string, any>;
export function folderDigest(directory: string): Promise<string>;
export function projectIdentity(cwd: string, host: string): Promise<{project_id:string;host:string}>;
export function reminderDecision(input: any, prior?: any[]): any;
export function runCommand(command: string, input: any, options?: {stateRoot?:string;skillRoot?:string;now?:string}): Promise<any>;
