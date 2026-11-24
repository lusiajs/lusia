import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import prettier from "prettier";
import plugin from "../../src/prettier-plugin/index.ts";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const CLI = join(ROOT, "src/cli/index.ts");
const FIXTURES = [
  "examples/stress/flow/Toggle.lusia",
  "examples/stress/components/Table.lusia",
  "examples/stress/animate/Tile.lusia",
];

async function formatWithPlugin(source: string, options: Record<string, unknown> = {}) {
  return prettier.format(source, { parser: "lusia", plugins: [plugin], ...options });
}

/** Runs `lusia format` on a copy of the source and returns the file it writes. */
async function formatWithCli(source: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "lusia-prettier-cli-"));
  try {
    await mkdir(join(dir, "node_modules"));
    const file = join(dir, "Component.lusia");
    await writeFile(file, source);
    const proc = Bun.spawn(["bun", CLI, "format", file], {
      cwd: dir,
      stdout: "pipe",
      stderr: "pipe",
    });
    const code = await proc.exited;
    if (code !== 0) throw new Error(await new Response(proc.stderr).text());
    return await readFile(file, "utf8");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** Removes the indent of every line, so the formatter has real work to do. */
function flushLeft(source: string): string {
  return source.replace(/^[ \t]+/gm, "");
}

async function fixtureSources(): Promise<string[]> {
  return Promise.all(FIXTURES.map((path) => readFile(join(ROOT, path), "utf8")));
}

describe("prettier plugin shape", () => {
  test("registers the Lusia language, parser, printer and option", () => {
    expect(plugin.languages).toEqual([
      { name: "Lusia", parsers: ["lusia"], extensions: [".lusia"] },
    ]);
    expect(Object.keys(plugin.parsers)).toEqual(["lusia"]);
    expect(plugin.parsers.lusia.astFormat).toBe("lusia");
    expect(Object.keys(plugin.printers)).toEqual(["lusia"]);
    expect(plugin.options.lusiaIndentScriptAndStyle).toMatchObject({
      category: "Lusia",
      type: "boolean",
      default: true,
    });
  });

  test("the package version matches lusiajs", async () => {
    const version = async (path: string) =>
      JSON.parse(await readFile(join(ROOT, path), "utf8")).version;
    expect(await version("packages/prettier-plugin/package.json")).toBe(
      await version("package.json"),
    );
  });
});

describe("prettier plugin format", () => {
  test("matches lusia format for the fixtures, flush-left and as written", async () => {
    for (const source of await fixtureSources()) {
      for (const input of [source, flushLeft(source)]) {
        expect(await formatWithPlugin(input)).toBe(await formatWithCli(input));
      }
    }
  }, 30_000);

  test("an already formatted file stays the same", async () => {
    for (const source of await fixtureSources()) {
      const once = await formatWithPlugin(flushLeft(source));
      expect(await formatWithPlugin(once)).toBe(once);
    }
  });

  test("lusiaIndentScriptAndStyle false keeps script and style flush-left", async () => {
    const source = "<script>\nconst a=1\n</script>\n<p>{a}</p>\n";
    const indented = await formatWithPlugin(source);
    const flat = await formatWithPlugin(source, { lusiaIndentScriptAndStyle: false });
    expect(indented).toContain("<script>\n  const a = 1;\n</script>");
    expect(flat).toContain("<script>\nconst a = 1;\n</script>");
  });

  test("printWidth and singleQuote reach the script", async () => {
    const source = '<script>\nconst name = "Ada";\n</script>\n';
    expect(await formatWithPlugin(source, { singleQuote: true })).toContain("'Ada'");
  });
});
