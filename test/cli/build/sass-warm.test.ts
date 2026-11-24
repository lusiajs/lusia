import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { warmStyles } from "#cli/build/sass-warm.ts";
import { parse } from "#compiler/parse/sections.ts";
import { compileStyleResult, forgetStyles, isStyleCached } from "#compiler/style/sass.ts";
import { DEFAULT_SCREENS } from "#runtime/screen/screens.ts";

const ID = "abc123";
const STYLE_SOURCE = `<style>\n@use "tokens";\n.a { color: tokens.$accent; }\n</style>\n`;

async function makeApp(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "lusia-warm-"));
  await writeFile(join(dir, "_tokens.scss"), "$accent: red;\n");
  return dir;
}

describe("warmStyles", () => {
  test("returns every Sass block, cached or compiled, and skips plain CSS", async () => {
    const dir = await makeApp();
    const file = join(dir, "Card.lusia");
    await writeFile(file, `${STYLE_SOURCE}<style lang="css">.b { color: red; }</style>\n`);
    const first = await warmStyles(dir, DEFAULT_SCREENS);
    expect(first).toEqual([{ file, index: 0, cached: false, ms: expect.any(Number) }]);
    expect(first[0]!.ms).toBeGreaterThan(0);
    const second = await warmStyles(dir, DEFAULT_SCREENS);
    expect(second).toEqual([{ file, index: 0, cached: true, ms: 0 }]);
    forgetStyles(file);
    await rm(dir, { recursive: true, force: true });
  });

  test("a warmed style is a cache hit: no Sass time", async () => {
    const dir = await makeApp();
    const file = join(dir, "Card.lusia");
    await writeFile(file, STYLE_SOURCE);
    await warmStyles(dir, DEFAULT_SCREENS);
    const style = parse(STYLE_SOURCE, file).styles[0]!;
    const result = compileStyleResult(style, file, ID, 0);
    expect(result.sassMs).toBe(0);
    expect(result.css).toContain("color: red;");
    expect(result.deps.map((dep) => dep.path)).toEqual([join(dir, "_tokens.scss")]);
    forgetStyles(file);
    await rm(dir, { recursive: true, force: true });
  });

  test("skips node_modules and dist folders", async () => {
    const dir = await makeApp();
    const file = join(dir, "dist", "Card.lusia");
    await mkdir(join(dir, "dist"));
    await mkdir(join(dir, "node_modules"));
    await writeFile(file, STYLE_SOURCE);
    await writeFile(join(dir, "node_modules", "Card.lusia"), STYLE_SOURCE);
    await warmStyles(dir, DEFAULT_SCREENS);
    const style = parse(STYLE_SOURCE, file).styles[0]!;
    expect(isStyleCached(file, 0, style, DEFAULT_SCREENS)).toBe(false);
    await rm(dir, { recursive: true, force: true });
  });

  test("uses the .gitignore instead of the defaults when one exists", async () => {
    const dir = await makeApp();
    await writeFile(join(dir, ".gitignore"), "generated/\n");
    const file = join(dir, "generated", "Card.lusia");
    const kept = join(dir, "dist", "Kept.lusia");
    await mkdir(join(dir, "generated"));
    await mkdir(join(dir, "dist"));
    await writeFile(file, STYLE_SOURCE);
    await writeFile(kept, STYLE_SOURCE);
    const blocks = await warmStyles(dir, DEFAULT_SCREENS);
    expect(blocks.map((block) => block.file)).toEqual([kept]);
    forgetStyles(kept);
    await rm(dir, { recursive: true, force: true });
  });

  test("a broken style is skipped, not thrown", async () => {
    const dir = await makeApp();
    const file = join(dir, "Broken.lusia");
    const source = "<style>\n.a {\n  color: red;\n</style>\n";
    await writeFile(file, source);
    await warmStyles(dir, DEFAULT_SCREENS);
    const style = parse(source, file).styles[0]!;
    expect(isStyleCached(file, 0, style, DEFAULT_SCREENS)).toBe(false);
    await rm(dir, { recursive: true, force: true });
  });
});
