import { afterAll, beforeAll, describe, expect, spyOn, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { runLint } from "#cli/lint/lint.ts";

const UNUSED = '<script>\nimport Badge from "./Badge.lusia";\n</script>\n<p>hi</p>\n';
const EMPTY = "<p>{ }</p>\n";
const BADGE =
  '<script>\nimport { props } from "lusiajs";\nconst { label } = props(class {\n  label = "";\n});\n</script>\n<p>{label}</p>\n';

let workRoot: string;
let caseIndex = 0;

beforeAll(async () => {
  workRoot = await mkdtemp(join(tmpdir(), "lusia-lint-"));
});

afterAll(async () => {
  await rm(workRoot, { recursive: true, force: true });
});

function testFolder(): string {
  return join(workRoot, `case-${caseIndex++}`);
}

async function writeLusia(dir: string, name: string, text: string): Promise<string> {
  const file = join(dir, name);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, text);
  return file;
}

function captureStdout(): () => string {
  const chunks: string[] = [];
  const spy = spyOn(process.stdout, "write").mockImplementation(((chunk: string | Uint8Array) => {
    chunks.push(String(chunk));
    return true;
  }) as unknown as typeof process.stdout.write);
  return () => {
    spy.mockRestore();
    return chunks.join("");
  };
}

function captureStderr(): () => string {
  const chunks: string[] = [];
  const spy = spyOn(process.stderr, "write").mockImplementation(((chunk: string | Uint8Array) => {
    chunks.push(String(chunk));
    return true;
  }) as unknown as typeof process.stderr.write);
  return () => {
    spy.mockRestore();
    return chunks.join("");
  };
}

interface Run {
  code: number;
  out: string;
  err: string;
}

async function lintFile(
  file: string,
  options: Partial<Parameters<typeof runLint>[0]> = {},
): Promise<Run> {
  const report = captureStdout();
  const errors = captureStderr();
  let code: number;
  try {
    code = await runLint({
      paths: [file],
      fix: false,
      maxWarnings: Infinity,
      quiet: true,
      ...options,
    });
  } catch (error) {
    report();
    errors();
    throw error;
  }
  return { code, out: report(), err: errors() };
}

describe("runLint", () => {
  test("prints a warning and exits 0 under the default warning limit", async () => {
    const dir = testFolder();
    const file = await writeLusia(dir, "App.lusia", UNUSED);
    const report = captureStdout();
    let code = 0;
    let out = "";
    try {
      code = await runLint({ paths: [file], fix: false, maxWarnings: Infinity, quiet: false });
    } finally {
      out = report();
    }
    expect(code).toBe(0);
    expect(out).toContain("App.lusia:2:1 warning unused-import:");
    expect(out).toContain("1 file checked: 0 errors, 1 warning.");
  });

  test("reports a compile error and a lint finding", async () => {
    const dir = testFolder();
    const file = await writeLusia(dir, "App.lusia", EMPTY);
    const { code, out, err } = await lintFile(file, { quiet: true });
    expect(code).toBe(1);
    expect(out).toContain("warning empty-expression:");
    expect(err).toContain("error L1011");
  });

  test("the configured severity sets the level and the exit code", async () => {
    const dir = testFolder();
    const file = await writeLusia(dir, "App.lusia", UNUSED);
    const { code, out } = await lintFile(file, { rules: { "unused-import": "error" } });
    expect(code).toBe(1);
    expect(out).toContain("error unused-import:");
  });

  test("an off rule is skipped", async () => {
    const dir = testFolder();
    const file = await writeLusia(dir, "App.lusia", UNUSED);
    const { code, out } = await lintFile(file, { rules: { "unused-import": "off" } });
    expect(code).toBe(0);
    expect(out).toBe("");
  });

  test("--fix removes an unused import and reports it", async () => {
    const dir = testFolder();
    const file = await writeLusia(dir, "App.lusia", UNUSED);
    const { code, out } = await lintFile(file, { fix: true, quiet: false });
    expect(code).toBe(0);
    expect(await readFile(file, "utf8")).toBe("<script>\n</script>\n<p>hi</p>\n");
    expect(out).toContain("1 fixed");
  });

  test("--max-warnings fails when there are more warnings than the limit", async () => {
    const dir = testFolder();
    const file = await writeLusia(dir, "App.lusia", UNUSED);
    const over = await lintFile(file, { maxWarnings: 0 });
    expect(over.code).toBe(1);
    expect(over.err).toContain("Too many warnings: 1, the limit is 0.");
    expect((await lintFile(file, { maxWarnings: 1 })).code).toBe(0);
  });

  test("reads the child props of an imported component from disk", async () => {
    const dir = testFolder();
    await writeLusia(dir, "Badge.lusia", BADGE);
    const parent = await writeLusia(
      dir,
      "Parent.lusia",
      '<script>\nimport Badge from "./Badge.lusia";\n</script>\n<Badge label="x" size="2" />\n',
    );
    const { code, out } = await lintFile(parent);
    expect(code).toBe(0);
    expect(out).toContain("Parent.lusia:4:");
    expect(out).toContain("warning unknown-prop:");
    expect(out).toContain('does not declare a prop named "size"');
  });

  test("disable comments hide the findings", async () => {
    const dir = testFolder();
    await writeLusia(dir, "Badge.lusia", BADGE);
    const parent = await writeLusia(
      dir,
      "Parent.lusia",
      '<script>\nimport Badge from "./Badge.lusia";\n</script>\n<!-- lusia-lint-disable-next-line unknown-prop -->\n<Badge size="2" />\n',
    );
    const { code, out } = await lintFile(parent);
    expect(code).toBe(0);
    expect(out).toBe("");
  });

  test("--quiet still prints the findings and hides the summary", async () => {
    const dir = testFolder();
    const file = await writeLusia(dir, "App.lusia", UNUSED);
    const { out } = await lintFile(file, { quiet: true });
    expect(out).toContain("unused-import");
    expect(out).not.toContain("file checked");
  });
});
