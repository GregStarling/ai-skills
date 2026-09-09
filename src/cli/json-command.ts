import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import type { CliCommand } from './router.js';

/** One request file, one JSON response. No implicit fixture/simulation mode. */
export function jsonCommand(name: string, summary: string,
  run: (input: unknown, cwd: string) => unknown | Promise<unknown>,
  exitCode: (result: unknown) => number = () => 0): CliCommand {
  return { name, summary, async run(args, { cwd }) {
    try {
      const path = args.length === 1 ? args[0] : args.length === 2 && args[0] === '--input' ? args[1] : undefined;
      if (!path) throw new Error(`Usage: model-governor ${name} --input <request.json|yaml>`);
      const input: unknown = parse(await readFile(resolve(cwd, path), 'utf8'));
      const result = await run(input, cwd);
      return { exitCode: exitCode(result), stdout: `${JSON.stringify(result, null, 2)}\n` };
    } catch (error) {
      const details = error instanceof Error && 'issues' in error ? error.issues : undefined;
      return { exitCode: 2, stdout: `${JSON.stringify({ status: 'ERROR', message: error instanceof Error ? error.message : String(error), ...(details === undefined ? {} : { diagnostics: details }) }, null, 2)}\n` };
    }
  } };
}
