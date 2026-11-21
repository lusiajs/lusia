import { afterAll, beforeAll, describe, expect, spyOn, test } from "bun:test";
import { statSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { UsageError } from "#cli/args/args.ts";
import { collectFiles } from "#cli/files.ts";
import { partsFor, prettierConfigFor } from "#cli/format/format-parts.ts";
import { runFormat } from "#cli/format/format.ts";
import { formatLusia } from "#language/format/format.ts";

const UNFORMATTED = [
  "<script>",
  'import {variable} from "lusiajs";',
  'const name=variable("Ada");',
  "</script>",
  "<style scoped>",
  ".card{padding:1rem}",
  "</style>",
  '<p class="a {name}">Hi {name.value}</p>',
  "",
].join("\n");

let workRoot: string;
let caseIndex = 0;

beforeAll(async () => {
  workRoot = await mkdtemp(join(tmpdir(), "lusia-format-"));
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

describe("runFormat", () => {
  test("formats a file in place, matching the shared formatter", async () => {
    const dir = testFolder();
    const file = await writeLusia(dir, "Card.lusia", UNFORMATTED);
    expect(await runFormat({ paths: [file], check: false, quiet: true })).toBe(0);

    const formatted = await readFile(file, "utf8");
    expect(formatted).toContain('const name = variable("Ada");');
    expect(formatted).toContain(".card {");
    expect(await formatLusia(UNFORMATTED, partsFor(await prettierConfigFor(file)))).toBe(formatted);
    expect(await runFormat({ paths: [file], check: false, quiet: true })).toBe(0);
    expect(await readFile(file, "utf8")).toBe(formatted);
  });

  test("--check lists the files that would change and exits 1 without writing", async () => {
    const dir = testFolder();
    const file = await writeLusia(dir, "Card.lusia", UNFORMATTED);
    const report = captureStdout();
    const code = await runFormat({ paths: [dir], check: true, quiet: false });
    const out = report();
    expect(code).toBe(1);
    expect(out).toContain("Card.lusia");
    expect(out).toContain("1 of 1 file would be reformatted.");
    expect(await readFile(file, "utf8")).toBe(UNFORMATTED);

    await runFormat({ paths: [dir], check: false, quiet: true });
    const clean = captureStdout();
    let cleanCode = 1;
    try {
      cleanCode = await runFormat({ paths: [dir], check: true, quiet: false });
    } finally {
      expect(clean()).toBe("The file is formatted.\n");
    }
    expect(cleanCode).toBe(0);
  });

  test("--quiet hides the summary, and the write summary names the count", async () => {
    const dir = testFolder();
    await writeLusia(dir, "Card.lusia", UNFORMATTED);
    const quiet = captureStdout();
    expect(await runFormat({ paths: [dir], check: false, quiet: true })).toBe(0);
    expect(quiet()).toBe("");

    await writeLusia(dir, "Card.lusia", UNFORMATTED);
    const loud = captureStdout();
    expect(await runFormat({ paths: [dir], check: false, quiet: false })).toBe(0);
    expect(loud()).toBe("Formatted 1 of 1 file.\n");
  });

  test("skips an already formatted file on the next run", async () => {
    const dir = testFolder();
    const file = await writeLusia(dir, "Card.lusia", UNFORMATTED);
    expect(await runFormat({ paths: [file], check: false, quiet: true })).toBe(0);
    const formatted = await readFile(file, "utf8");
    const mtime = statSync(file).mtimeMs;
    await Bun.sleep(10);
    expect(await runFormat({ paths: [file], check: false, quiet: true })).toBe(0);
    expect(await readFile(file, "utf8")).toBe(formatted);
    expect(statSync(file).mtimeMs).toBe(mtime);
  });

  test("a changed file is formatted again even after a cached run", async () => {
    const dir = testFolder();
    const file = await writeLusia(dir, "Card.lusia", UNFORMATTED);
    await runFormat({ paths: [file], check: false, quiet: true });
    await writeFile(file, `${UNFORMATTED}<p>   extra</p>\n`);
    const report = captureStdout();
    expect(await runFormat({ paths: [file], check: true, quiet: true })).toBe(1);
    expect(report()).toContain("Card.lusia");
    expect(await runFormat({ paths: [file], check: false, quiet: true })).toBe(0);
    expect(await readFile(file, "utf8")).toContain("<p>extra</p>");
  });

  test("--no-cache formats again instead of using the cache", async () => {
    const dir = testFolder();
    const file = await writeLusia(dir, "Card.lusia", UNFORMATTED);
    await runFormat({ paths: [file], check: false, quiet: true });
    const formatted = await readFile(file, "utf8");
    await writeFile(file, UNFORMATTED);
    expect(
      await runFormat({
        paths: [file],
        check: false,
        quiet: true,
        cache: false,
      }),
    ).toBe(0);
    expect(await readFile(file, "utf8")).toBe(formatted);
  });

  test("reports a file that cannot be formatted and exits 1", async () => {
    const dir = testFolder();
    const file = await writeLusia(dir, "Broken.lusia", "<script>\nconst a = ;\n</script>\n");
    const errors = captureStderr();
    expect(await runFormat({ paths: [file], check: false, quiet: true })).toBe(1);
    expect(errors()).toContain("Broken.lusia");
    expect(await readFile(file, "utf8")).toBe("<script>\nconst a = ;\n</script>\n");
  });
});

describe("collectFiles", () => {
  test("finds .lusia files in folders and globs, skipping build folders", async () => {
    const dir = testFolder();
    await writeLusia(dir, "App.lusia", "");
    await writeLusia(dir, "components/Card.lusia", "");
    await writeLusia(dir, "node_modules/Skip.lusia", "");
    await writeLusia(dir, "dist/Skip.lusia", "");
    await writeLusia(dir, ".worktrees/Skip.lusia", "");
    await writeLusia(dir, "notes.txt", "");
    const names = (files: string[]): string[] => files.map((file) => relative(dir, file));

    expect(names(await collectFiles([dir]))).toEqual(["App.lusia", "components/Card.lusia"]);
    expect(names(await collectFiles([`${dir}/*.lusia`]))).toEqual(["App.lusia"]);
    expect(names(await collectFiles([`${dir}/**/*.lusia`]))).toEqual([
      "App.lusia",
      "components/Card.lusia",
    ]);
    expect(names(await collectFiles([dir, join(dir, "App.lusia")]))).toEqual([
      "App.lusia",
      "components/Card.lusia",
    ]);
    expect(await collectFiles([join(dir, "notes.txt")])).toEqual([]);
  });

  test("a missing path is a usage error", async () => {
    await expect(collectFiles([join(testFolder(), "missing.lusia")])).rejects.toThrow(UsageError);
  });
});
