import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildPrettierPlugin } from "../../../scripts/build-prettier-plugin.ts";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const PLUGIN_DIR = join(ROOT, "packages/prettier-plugin");
const PLUGIN_FILE = join(PLUGIN_DIR, "dist/index.js");
const PRETTIER_BIN = join(ROOT, "node_modules/prettier/bin/prettier.cjs");

const MESSY = [
  "<script>",
  'import {variable} from "lusiajs";',
  "const a=variable(1)",
  "</script>",
  "<style>",
  ".a{color:red}",
  "</style>",
  '<p class="x">{a.value}</p>',
  "",
].join("\n");

const FORMATTED = [
  "<script>",
  '  import { variable } from "lusiajs";',
  "  const a = variable(1);",
  "</script>",
  "",
  "<style>",
  "  .a {",
  "    color: red;",
  "  }",
  "</style>",
  "",
  '<p class="x">{a.value}</p>',
  "",
].join("\n");

let workRoot: string;
let caseIndex = 0;

beforeAll(async () => {
  await buildPrettierPlugin();
  workRoot = await mkdtemp(join(tmpdir(), "lusia-prettier-e2e-"));
});

afterAll(async () => {
  await rm(workRoot, { recursive: true, force: true });
});

/** A folder with a `.prettierrc` that loads the plugin, and a messy `Card.lusia`. */
async function projectWith(plugin: string): Promise<string> {
  const dir = join(workRoot, `case-${caseIndex++}`);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, ".prettierrc"), JSON.stringify({ plugins: [plugin] }));
  await writeFile(join(dir, "Card.lusia"), MESSY);
  return dir;
}

async function runPrettierWrite(dir: string): Promise<number> {
  const proc = Bun.spawn([process.execPath, PRETTIER_BIN, "--write", "Card.lusia"], {
    cwd: dir,
    stdout: "pipe",
    stderr: "pipe",
  });
  return proc.exited;
}

describe("prettier --write with the plugin", () => {
  test("formats a .lusia file when the plugin is loaded by absolute path", async () => {
    const dir = await projectWith(PLUGIN_FILE);
    expect(await runPrettierWrite(dir)).toBe(0);
    expect(await readFile(join(dir, "Card.lusia"), "utf8")).toBe(FORMATTED);
  });

  test("formats a .lusia file when the plugin is loaded by package name", async () => {
    const dir = await projectWith("@lusiajs/prettier-plugin");
    await mkdir(join(dir, "node_modules/@lusiajs"), { recursive: true });
    await symlink(PLUGIN_DIR, join(dir, "node_modules/@lusiajs/prettier-plugin"));
    expect(await runPrettierWrite(dir)).toBe(0);
    expect(await readFile(join(dir, "Card.lusia"), "utf8")).toBe(FORMATTED);
  });
});
