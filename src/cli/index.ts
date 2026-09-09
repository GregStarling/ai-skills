#!/usr/bin/env node
import { existsSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createCliRouter, loadCliRegistry, formatAvailableCommands, type CliCommand } from "./router.js";

const helpCommand: CliCommand = {
  name: "help",
  summary: "Show available commands.",
  run: () => ({
    exitCode: 0,
    stdout: formatAvailableCommands(router.commands)
  })
};

const router = createCliRouter([
  helpCommand
] satisfies readonly CliCommand[]);

await loadCliRegistry(router);

export { router };

if (process.argv[1] !== undefined && existsSync(process.argv[1]) &&
    realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  const result = await router.dispatch({
    argv: process.argv.slice(2),
    cwd: process.cwd(),
    env: process.env
  });

  if (result.stdout !== undefined) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr !== undefined) {
    process.stderr.write(result.stderr);
  }

  process.exitCode = result.exitCode;
}
