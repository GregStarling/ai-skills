#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, realpath, mkdir, copyFile, readFile, writeFile, symlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

const criteria = new Set(["all", "plan", "scaffold", "live-entry"]);
const criterion = readCriterion(process.argv.slice(2));

if (criterion === "v1" || criterion === "v1-live") {
  fail(`${criterion} verification is not implemented yet; scaffold checks do not prove full v1 or live provider behavior.`);
}

if (!criteria.has(criterion)) {
  fail(`Unknown criterion: ${criterion}`);
}

if (criterion === "all" || criterion === "plan") {
  await verifyPlan();
}

if (criterion === "all" || criterion === "scaffold" || criterion === "live-entry") {
  await verifyScaffold();
}

if (criterion === "live-entry") {
  const packageJson = await readJson("package.json");
  if (packageJson.scripts?.["verify:v1:live"] !== "node scripts/verify/scaffold.mjs --criterion v1-live") {
    fail("package.json scripts.verify:v1:live must declare the live verification entry point");
  }
}

function readCriterion(argv) {
  const index = argv.indexOf("--criterion");
  return index === -1 ? "all" : argv[index + 1] ?? "";
}

async function verifyPlan() {
  const planPath = join(repoRoot, "docs/plan.md");
  if (!existsSync(planPath)) {
    fail("docs/plan.md is missing");
  }

  const plan = await readText("docs/plan.md");
  const requiredHeadings = [
    "Phase Branch Setup",
    "Repository Files",
    "Core Types",
    "Validator Stages",
    "Ordered Checkpoints",
    "Requirement Ownership",
    "Acceptance Scenario Map",
    "Repair Authority",
    "Assumptions",
    "Test Strategy"
  ];

  for (const heading of requiredHeadings) {
    requireIncludes(plan, heading, "docs/plan.md");
  }

  for (let index = 1; index <= 20; index += 1) {
    requireIncludes(plan, `REQ-${String(index).padStart(3, "0")}`, "docs/plan.md");
  }

  for (let index = 1; index <= 44; index += 1) {
    requireIncludes(plan, `AC-${String(index).padStart(3, "0")}`, "docs/plan.md");
  }
}

async function verifyScaffold() {
  const packageJson = await readJson("package.json");
  const tsconfig = await readJson("tsconfig.json");
  const buildConfig = await readJson("tsconfig.build.json");

  if (packageJson.type !== "module") {
    fail("package.json must declare type: module");
  }
  if (packageJson.bin?.["model-governor"] !== "./dist/cli/index.js") {
    fail("package.json must expose the model-governor CLI bin");
  }

  const requiredScripts = ["test", "typecheck", "build", "governor", "verify:v1", "verify:v1:live"];
  for (const script of requiredScripts) {
    if (typeof packageJson.scripts?.[script] !== "string" || packageJson.scripts[script].length === 0) {
      fail(`package.json missing script: ${script}`);
    }
  }

  const requiredDependencies = ["zod", "yaml", "@iarna/toml"];
  for (const dependency of requiredDependencies) {
    if (typeof packageJson.dependencies?.[dependency] !== "string") {
      fail(`package.json missing dependency: ${dependency}`);
    }
  }

  const requiredDevDependencies = ["typescript", "vitest", "@types/node"];
  for (const dependency of requiredDevDependencies) {
    if (typeof packageJson.devDependencies?.[dependency] !== "string") {
      fail(`package.json missing devDependency: ${dependency}`);
    }
  }

  const compiler = tsconfig.compilerOptions ?? {};
  const requiredStrictOptions = {
    strict: true,
    noUncheckedIndexedAccess: true,
    exactOptionalPropertyTypes: true,
    noImplicitOverride: true,
    noPropertyAccessFromIndexSignature: true,
    useUnknownInCatchVariables: true,
    isolatedModules: true
  };

  for (const [option, expected] of Object.entries(requiredStrictOptions)) {
    if (compiler[option] !== expected) {
      fail(`tsconfig.json compilerOptions.${option} must be ${String(expected)}`);
    }
  }

  if (buildConfig.compilerOptions?.outDir !== "dist") {
    fail("tsconfig.build.json must emit to dist");
  }

  await verifyCliBehavior();

  if (!existsSync(join(repoRoot, "package-lock.json"))) {
    fail("package-lock.json is missing");
  }
}

async function verifyCliBehavior() {
  // The same public command downstream gates use also proves a clean build.
  await mkdir(join(repoRoot, "dist/cli/registry"), { recursive: true });
  const stalePath = join(repoRoot, "dist/cli/registry/stale.mjs");
  await writeFile(stalePath, "throw new Error('stale registry executed');\n");
  const built = spawnSync("npm", ["run", "--silent", "governor", "--", "--help"], {
    cwd: repoRoot, encoding: "utf8"
  });
  assert.equal(built.status, 0, built.stderr || built.stdout);
  assert.match(built.stdout, /^Usage: model-governor/m);
  assert.equal(existsSync(stalePath), false, "build must remove stale registry modules");

  const imported = spawnSync(process.execPath, ["--input-type=module", "-e",
    `await import(${JSON.stringify(pathToFileURL(join(repoRoot, "dist/cli/index.js")).href)})`,
    "missing-entry.js"], { cwd: repoRoot, encoding: "utf8" });
  assert.equal(imported.status, 0, imported.stderr);
  assert.equal(imported.stdout, "", "importing the public CLI must not dispatch argv");

  const { createCliRouter, loadCliRegistry } = await import(
    pathToFileURL(join(repoRoot, "dist/cli/router.js")).href
  );
  const { router: entryRouter } = await import(
    pathToFileURL(join(repoRoot, "dist/cli/index.js")).href
  );
  assert.equal((await entryRouter.dispatch({ argv: ["help"] })).exitCode, 0);
  for (const invalid of [null, {}, { name: "BAD", summary: "bad", run() {} },
    { name: "bad", summary: "", run() {} }, { name: "bad", summary: "bad", run: 1 }]) {
    assert.throws(() => createCliRouter().register(invalid), /Invalid command registration/);
  }

  const scratch = await realpath(await mkdtemp(join(tmpdir(), "governor scaffold ")));
  try {
    const registry = join(scratch, "registry");
    await mkdir(registry);
    const commandSource = (name) => `export const commands = [{ name: ${JSON.stringify(name)},
      summary: "Scaffold behavioral fixture.",
      run: (args, context) => ({ exitCode: 0,
        stdout: JSON.stringify({ args, cwd: context.cwd, marker: context.env.GOVERNOR_FIXTURE }) }) }];`;
    await writeFile(join(registry, "z.mjs"), commandSource("last"));
    await writeFile(join(registry, "a.mjs"), commandSource("proof"));
    await writeFile(join(registry, "ignored.d.ts"), "this is not executable JavaScript");
    const router = createCliRouter();
    await loadCliRegistry(router, pathToFileURL(registry));
    assert.deepEqual([...router.commands.keys()], ["proof", "last"]);
    assert.deepEqual(JSON.parse((await router.dispatch({
      argv: ["proof", "argument with spaces"], cwd: scratch, env: { GOVERNOR_FIXTURE: "observed" }
    })).stdout), { args: ["argument with spaces"], cwd: scratch, marker: "observed" });
    assert.equal((await router.dispatch({ argv: ["missing"] })).exitCode, 2);
    await loadCliRegistry(createCliRouter(), pathToFileURL(join(scratch, "absent")));
    await assert.rejects(loadCliRegistry(router, pathToFileURL(registry)), /Duplicate command/);
    for (const [name, source] of [
      ["missing", "export const other = [];"],
      ["shape", "export const commands = {};"],
      ["invalid", "export const commands = [null];"]
    ]) {
      const directory = join(scratch, name);
      await mkdir(directory);
      await writeFile(join(directory, "bad.mjs"), source);
      await assert.rejects(loadCliRegistry(createCliRouter(), pathToFileURL(directory)), /Invalid/);
    }

    // Execute the actual built entry and its automatic sibling registry loader.
    await writeFile(join(scratch, "package.json"), '{"type":"module"}');
    for (const name of ["index.js", "router.js"]) {
      await copyFile(join(repoRoot, "dist/cli", name), join(scratch, name));
    }
    const link = join(scratch, "linked cli.js");
    await symlink(join(scratch, "index.js"), link);
    for (const entry of [join(scratch, "index.js"), link]) {
      const child = spawnSync(process.execPath, [entry, "proof", "subprocess argument"], {
        cwd: scratch, env: { ...process.env, GOVERNOR_FIXTURE: "subprocess" }, encoding: "utf8"
      });
      assert.equal(child.status, 0, child.stderr);
      assert.deepEqual(JSON.parse(child.stdout), {
        args: ["subprocess argument"], cwd: scratch, marker: "subprocess"
      });
    }
    const unknown = spawnSync(process.execPath, [link, "unknown"], { encoding: "utf8" });
    assert.equal(unknown.status, 2);
    assert.match(unknown.stderr, /Unknown command/);
    await writeFile(join(registry, "duplicate.mjs"), commandSource("proof"));
    const duplicate = spawnSync(process.execPath, [link, "proof"], { encoding: "utf8" });
    assert.notEqual(duplicate.status, 0);
    assert.match(duplicate.stderr, /Duplicate command registration/);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
}

async function readJson(relativePath) {
  try {
    return JSON.parse(await readText(relativePath));
  } catch (error) {
    fail(`${relativePath} is not valid JSON: ${error.message}`);
  }
}

async function readText(relativePath) {
  return readFile(join(repoRoot, relativePath), "utf8");
}

function requireIncludes(value, needle, label) {
  if (!value.includes(needle)) {
    fail(`${label} missing required text: ${needle}`);
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
