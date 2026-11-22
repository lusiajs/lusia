import { expect, test } from "bun:test";
import { join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { buildEditor } from "../../scripts/build-editor.ts";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const TOOLS_DIR = "packages/language-tools";
const BUILD_TIMEOUT_MS = 60_000;

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

test(
  "built editor entry loads in plain node and exports the contract",
  async () => {
    await buildEditor(ROOT);
    const loaded = await loadWithPlainNode(join(ROOT, TOOLS_DIR, "dist/vscode.js"));

    expect(loaded.version).toBe(1);
    for (const name of CONTRACT_NAMESPACES) {
      expect(loaded.keys).toContain(name);
    }
  },
  BUILD_TIMEOUT_MS,
);

test("language tools version matches lusiajs", async () => {
  const rootPackage = await Bun.file(join(ROOT, "package.json")).json();
  const toolsPackage = await Bun.file(join(ROOT, TOOLS_DIR, "package.json")).json();
  expect(toolsPackage.version).toBe(rootPackage.version);
});
