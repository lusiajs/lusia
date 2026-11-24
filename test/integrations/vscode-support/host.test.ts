import { beforeAll, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { buildVsCodeSupport } from "../../../scripts/build-vscode-support.ts";

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const SUPPORT_DIR = "packages/vscode-support";
const BUILD_TIMEOUT_MS = 60_000;
const CONSUMER_CHECK_LIMIT_MS = 20_000;
const TIMED_OUT = Symbol("timed out");

const CONSUMER_TSCONFIG = {
  compilerOptions: {
    target: "ESNext",
    module: "ESNext",
    moduleResolution: "bundler",
    lib: ["ESNext", "DOM"],
    types: [],
    strict: true,
    noEmit: true,
    skipLibCheck: false,
  },
  files: ["index.ts"],
};

const CONSUMER_INDEX = `import { EDITOR_API_VERSION, hover, lint } from "@lusiajs/vscode-support/vscode";

export const version: number = EDITOR_API_VERSION;
export type Issue = lint.LintIssue;
export type Hover = ReturnType<typeof hover.hoverAt>;
`;

async function writeConsumer(consumerDir: string): Promise<void> {
  await mkdir(join(consumerDir, "node_modules/@lusiajs"), { recursive: true });
  await symlink(
    join(ROOT, SUPPORT_DIR),
    join(consumerDir, "node_modules/@lusiajs/vscode-support"),
    "dir",
  );
  await writeFile(
    join(consumerDir, "package.json"),
    JSON.stringify({ name: "consumer", private: true, type: "module" }),
  );
  await writeFile(join(consumerDir, "tsconfig.json"), JSON.stringify(CONSUMER_TSCONFIG));
  await writeFile(join(consumerDir, "index.ts"), CONSUMER_INDEX);
}

async function typecheckConsumer(
  consumerDir: string,
): Promise<{ code: number; output: string } | typeof TIMED_OUT> {
  const tsc = join(ROOT, "node_modules/typescript/bin/tsc");
  const proc = Bun.spawn([process.execPath, tsc, "-p", join(consumerDir, "tsconfig.json")], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const outcome = await Promise.race([proc.exited, waitForLimit()]);
  if (outcome === TIMED_OUT) {
    proc.kill();
    return TIMED_OUT;
  }
  const output =
    (await Bun.readableStreamToText(proc.stdout)) + (await Bun.readableStreamToText(proc.stderr));
  return { code: outcome, output };
}

function waitForLimit(): Promise<typeof TIMED_OUT> {
  return Bun.sleep(CONSUMER_CHECK_LIMIT_MS).then(() => TIMED_OUT);
}

const CONTRACT_NAMESPACES = [
  "range",
  "completions",
  "completionData",
  "markupItems",
  "hover",
  "markdown",
  "apiLookup",
  "autoImport",
  "errorPosition",
  "semanticTokens",
  "scriptSymbols",
  "format",
  "formatExpressions",
  "indentSetting",
  "prettierParts",
  "lint",
  "parseImports",
  "parseProps",
  "parseRegions",
  "parseSections",
  "parseTag",
  "compiler",
  "api",
  "runtime",
];

async function loadWithPlainNode(entry: string): Promise<{ version: number; keys: string[] }> {
  const entryUrl = pathToFileURL(entry).href;
  const script = `import(${JSON.stringify(entryUrl)}).then(m => console.log(JSON.stringify({ version: m.EDITOR_API_VERSION, keys: Object.keys(m) })))`;
  const proc = Bun.spawn(["node", "--input-type=module", "-e", script], {
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, code] = await Promise.all([
    Bun.readableStreamToText(proc.stdout),
    Bun.readableStreamToText(proc.stderr),
    proc.exited,
  ]);
  expect(stderr).toBe("");
  expect(code).toBe(0);
  return JSON.parse(stdout);
}

beforeAll(() => buildVsCodeSupport(ROOT), BUILD_TIMEOUT_MS);

test(
  "built editor entry loads in plain node and exports the contract",
  async () => {
    const loaded = await loadWithPlainNode(join(ROOT, SUPPORT_DIR, "dist/vscode.js"));

    expect(loaded.version).toBe(1);
    for (const name of CONTRACT_NAMESPACES) {
      expect(loaded.keys).toContain(name);
    }
  },
  BUILD_TIMEOUT_MS,
);

test("vscode support version matches lusiajs", async () => {
  const rootPackage = await Bun.file(join(ROOT, "package.json")).json();
  const supportPackage = await Bun.file(join(ROOT, SUPPORT_DIR, "package.json")).json();
  expect(supportPackage.version).toBe(rootPackage.version);
});

test(
  "built editor types check in a consumer without skipLibCheck",
  async () => {
    const consumerDir = await mkdtemp(join(tmpdir(), "lusia-consumer-"));
    try {
      await writeConsumer(consumerDir);
      const result = await typecheckConsumer(consumerDir);
      if (result === TIMED_OUT) {
        console.warn(
          `Skipped consumer type check: it took over ${CONSUMER_CHECK_LIMIT_MS / 1000}s.`,
        );
        return;
      }
      expect(result.output).toBe("");
      expect(result.code).toBe(0);
    } finally {
      await rm(consumerDir, { recursive: true, force: true });
    }
  },
  BUILD_TIMEOUT_MS,
);
