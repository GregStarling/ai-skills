import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export type CliCommandResult = {
  readonly exitCode: number;
  readonly stdout?: string;
  readonly stderr?: string;
};

export type CliCommandContext = {
  readonly cwd: string;
  readonly env: NodeJS.ProcessEnv;
};

export type CliCommand = {
  readonly name: string;
  readonly summary: string;
  readonly run: (
    args: readonly string[],
    context: CliCommandContext
  ) => Promise<CliCommandResult> | CliCommandResult;
};

export type RouteRequest = {
  readonly argv: readonly string[];
  readonly cwd?: string;
  readonly env?: NodeJS.ProcessEnv;
};

export type CliRouter = {
  readonly commands: ReadonlyMap<string, CliCommand>;
  readonly dispatch: (request: RouteRequest) => Promise<CliCommandResult>;
  readonly register: (command: CliCommand) => CliRouter;
};

export class CommandError extends Error {
  readonly exitCode: number;

  constructor(message: string, exitCode = 2) {
    super(message);
    this.name = "CommandError";
    this.exitCode = exitCode;
  }
}

export function createCliRouter(commands: readonly CliCommand[] = []): CliRouter {
  const registry = new Map<string, CliCommand>();

  const register = (command: CliCommand): CliRouter => {
    if (typeof command !== "object" || command === null ||
        typeof command.name !== "string" || !isCommandName(command.name) ||
        typeof command.summary !== "string" || command.summary.trim().length === 0 ||
        typeof command.run !== "function") {
      throw new CommandError("Invalid command registration: expected name, summary, and run.");
    }
    if (registry.has(command.name)) {
      throw new CommandError(`Duplicate command registration: ${command.name}`);
    }
    registry.set(command.name, command);
    return router;
  };

  const dispatch = async (request: RouteRequest): Promise<CliCommandResult> => {
    const [commandName, ...commandArgs] = request.argv;

    if (commandName === undefined || commandName === "--help" || commandName === "-h") {
      return {
        exitCode: commandName === undefined ? 2 : 0,
        stdout: formatAvailableCommands(registry)
      };
    }

    const command = registry.get(commandName);
    if (command === undefined) {
      return {
        exitCode: 2,
        stderr: `Unknown command: ${commandName}\n\n${formatAvailableCommands(registry)}`
      };
    }

    return command.run(commandArgs, {
      cwd: request.cwd ?? process.cwd(),
      env: request.env ?? process.env
    });
  };

  const router: CliRouter = {
    get commands() {
      return new Map(registry);
    },
    dispatch,
    register
  };

  for (const command of commands) {
    register(command);
  }

  return router;
}

export function formatAvailableCommands(commands: ReadonlyMap<string, CliCommand>): string {
  const lines = ["Usage: model-governor <command> [args]", "", "Commands:"];
  const sorted = Array.from(commands.values()).sort((left, right) =>
    left.name.localeCompare(right.name)
  );

  if (sorted.length === 0) {
    lines.push("  (no commands registered)");
  } else {
    for (const command of sorted) {
      lines.push(`  ${command.name.padEnd(24)} ${command.summary}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

function isCommandName(value: string): boolean {
  return /^[a-z][a-z0-9:-]*$/.test(value);
}

/** Registry modules export `const commands = [...] satisfies readonly CliCommand[]`.
 * Built .js/.mjs files load in filename order. A missing registry is an empty scaffold.
 */
export async function loadCliRegistry(
  router: CliRouter,
  directory: URL = new URL("./registry/", import.meta.url)
): Promise<void> {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return;
    throw error;
  }
  const files = entries.filter((entry) => entry.isFile() && /\.m?js$/.test(entry.name))
    .map((entry) => entry.name).sort();
  for (const name of files) {
    const module: { commands?: unknown } = await import(
      pathToFileURL(join(fileURLToPath(directory), name)).href
    );
    if (!Array.isArray(module.commands)) {
      throw new CommandError(`Invalid registry module ${name}: expected named commands array.`);
    }
    for (const command of module.commands) router.register(command);
  }
}
