import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { formatBuildFailure, type BuildLog } from "#cli/build/build-errors.ts";
import { lusia } from "#bun-plugin/index.ts";

const REPO = new URL("../../../", import.meta.url).pathname;
const ACTIVE_IMPORT = `<script>
import { variable, ACTIVE } from "lusiajs";
const count = variable(1);
console.log(ACTIVE, count);
</script>
<p>{count}</p>
`;

let workRoot: string;

beforeAll(async () => {
  workRoot = await mkdtemp(join(tmpdir(), "lusia-build-errors-"));
  await mkdir(join(workRoot, "node_modules"));
  await symlink(REPO, join(workRoot, "node_modules", "lusiajs"), "dir");
});

afterAll(async () => {
  await rm(workRoot, { recursive: true, force: true });
});

/** Runs a real Bun.build on one entry file in a fresh folder and returns its failure logs. */
async function failingLogs(
  name: string,
  files: Record<string, string>,
  entry: string,
): Promise<BuildLog[]> {
  const dir = await mkdtemp(join(workRoot, `${name}-`));
  await mkdir(join(dir, "src"));
  for (const [path, text] of Object.entries(files)) await writeFile(join(dir, path), text);
  const result = await Bun.build({
    entrypoints: [join(dir, entry)],
    throw: false,
    plugins: [lusia({ dev: false })],
  });
  expect(result.success).toBe(false);
  return result.logs;
}

function displayPath(path: string): string {
  return relative(process.cwd(), path);
}

describe("formatBuildFailure", () => {
  test("a .lusia import of a renamed export gets a location, a caret and a rename hint", async () => {
    const logs = await failingLogs(
      "active",
      {
        "src/Card.lusia": ACTIVE_IMPORT,
        "src/index.ts": 'import "./Card.lusia";\n',
      },
      "src/index.ts",
    );
    const text = formatBuildFailure(logs, false);
    expect(text).toContain(
      `${displayPath(logs[0]!.position!.file)}:2:20 - error L3001: "ACTIVE" is not exported by "lusiajs"`,
    );
    expect(text).toContain('2 | import { variable, ACTIVE } from "lusiajs";');
    expect(text).toContain("  | " + " ".repeat(19) + "^~~~~~");
    expect(text).toContain("hint: ACTIVE was renamed to ON.");
    expect(text).toContain("Build failed: 1 error");
  });

  test("an import of the old store name points to variable", async () => {
    const logs = await failingLogs(
      "store",
      {
        "src/index.ts": 'import { store } from "lusiajs";\nconsole.log(store);\n',
      },
      "src/index.ts",
    );
    const text = formatBuildFailure(logs, false);
    expect(text).toContain('error L3001: "store" is not exported by "lusiajs"');
    expect(text).toContain("hint: store was renamed to variable.");
  });

  test("a missing relative file gets L3002 at the importing line", async () => {
    const logs = await failingLogs(
      "missing",
      { "src/index.ts": 'import { x } from "./nope.ts";\nconsole.log(x);\n' },
      "src/index.ts",
    );
    const text = formatBuildFailure(logs, false);
    expect(text).toContain(`${displayPath(logs[0]!.position!.file)}:1:`);
    expect(text).toContain('error L3002: cannot resolve "./nope.ts"');
    expect(text).toContain('1 | import { x } from "./nope.ts";');
  });

  test("a missing import with no position is found by searching the sources", async () => {
    const dir = await mkdtemp(join(workRoot, "search-"));
    await writeFile(
      join(dir, "Card.lusia"),
      '<script>\n  import Gone from "./Gone.lusia";\n</script>\n',
    );
    const log = {
      message: 'Could not resolve: "./Gone.lusia"',
      level: "error",
    } as BuildLog;
    const text = formatBuildFailure([log], false, dir);
    expect(text).toContain(`${displayPath(join(dir, "Card.lusia"))}:2:20 - error L3002`);
    expect(text).toContain('2 |   import Gone from "./Gone.lusia";');
  });

  test("a missing import shows its file even when no line can be found", () => {
    const log = {
      message: 'Could not resolve: "./Gone.lusia"',
      level: "error",
      position: {
        file: join(workRoot, "none.lusia"),
        lineText: "x",
        line: 1,
        column: 1,
        length: 1,
      },
    } as BuildLog;
    const text = formatBuildFailure([log], false, workRoot);
    expect(text).toContain(`${displayPath(join(workRoot, "none.lusia"))} - error L3002`);
  });

  test("a misspelled export suggests the closest real export", async () => {
    const logs = await failingLogs(
      "typo",
      {
        "src/index.ts": 'import { variabl } from "lusiajs";\nconsole.log(variabl);\n',
      },
      "src/index.ts",
    );
    const text = formatBuildFailure(logs, false);
    expect(text).toContain('error L3001: "variabl" is not exported by "lusiajs"');
    expect(text).toContain('hint: Did you mean "variable"?');
  });

  test("a compile error from the plugin is printed once, as it was formatted", async () => {
    const logs = await failingLogs(
      "compile",
      {
        "src/Bad.lusia": "<p>{}</p>\n",
        "src/index.ts": 'import "./Bad.lusia";\n',
      },
      "src/index.ts",
    );
    const text = formatBuildFailure(logs, false);
    expect(text).toContain("error L1011: empty {}");
    expect(text).not.toContain("L3003");
  });

  test("no ANSI colors when color is off", async () => {
    const logs = await failingLogs(
      "plain",
      {
        "src/index.ts": 'import { variabl } from "lusiajs";\nconsole.log(variabl);\n',
      },
      "src/index.ts",
    );
    expect(formatBuildFailure(logs, false)).not.toContain("\x1b[");
    expect(formatBuildFailure(logs, true)).toContain("\x1b[");
  });
});
