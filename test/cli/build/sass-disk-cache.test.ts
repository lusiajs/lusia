import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadStyleCache, saveStyleCache, styleCachePath } from "#cli/build/sass-disk-cache.ts";
import { parse } from "#compiler/parse/sections.ts";
import { compileStyleResult, forgetStyles } from "#compiler/style/sass.ts";
import { DEFAULT_SCREENS } from "#runtime/screen/screens.ts";

const ID = "abc123";
const STYLE_SOURCE = `<style>\n@use "tokens";\n.a { color: tokens.$accent; }\n</style>\n`;

async function makeApp(): Promise<{
  dir: string;
  file: string;
  style: ReturnType<typeof parse>["styles"][number];
}> {
  const dir = await mkdtemp(join(tmpdir(), "lusia-disk-"));
  const file = join(dir, "Card.lusia");
  await writeFile(join(dir, "_tokens.scss"), "$accent: red;\n");
  await writeFile(file, STYLE_SOURCE);
  return { dir, file, style: parse(STYLE_SOURCE, file).styles[0]! };
}

describe("style disk cache", () => {
  test("a saved style loads back as a cache hit", async () => {
    const { dir, file, style } = await makeApp();
    compileStyleResult(style, file, ID, 0, DEFAULT_SCREENS);
    await saveStyleCache(dir);
    forgetStyles(file);
    await loadStyleCache(dir);
    const result = compileStyleResult(style, file, ID, 0, DEFAULT_SCREENS);
    expect(result.sassMs).toBe(0);
    expect(result.css).toContain("color: red;");
    forgetStyles(file);
    await rm(dir, { recursive: true, force: true });
  });

  test("a changed Sass import is not loaded from disk", async () => {
    const { dir, file, style } = await makeApp();
    compileStyleResult(style, file, ID, 0, DEFAULT_SCREENS);
    await saveStyleCache(dir);
    forgetStyles(file);
    await writeFile(join(dir, "_tokens.scss"), "$accent: blue;\n");
    await loadStyleCache(dir);
    expect(compileStyleResult(style, file, ID, 0, DEFAULT_SCREENS).css).toContain("color: blue;");
    forgetStyles(file);
    await rm(dir, { recursive: true, force: true });
  });

  test("a corrupt cache file is ignored", async () => {
    const { dir, file, style } = await makeApp();
    await mkdir(join(dir, "node_modules", ".cache", "lusia"), { recursive: true });
    await writeFile(styleCachePath(dir), "{ not json");
    await loadStyleCache(dir);
    expect(compileStyleResult(style, file, ID, 0, DEFAULT_SCREENS).css).toContain("color: red;");
    forgetStyles(file);
    await rm(dir, { recursive: true, force: true });
  });

  test("a cache from another lusia version is ignored", async () => {
    const { dir, file, style } = await makeApp();
    compileStyleResult(style, file, ID, 0, DEFAULT_SCREENS);
    await saveStyleCache(dir);
    const saved = JSON.parse(await readFile(styleCachePath(dir), "utf8"));
    saved.version = "0.0.0-old";
    await writeFile(styleCachePath(dir), JSON.stringify(saved));
    forgetStyles(file);
    await loadStyleCache(dir);
    expect(compileStyleResult(style, file, ID, 0, DEFAULT_SCREENS).sassMs).not.toBe(0);
    forgetStyles(file);
    await rm(dir, { recursive: true, force: true });
  });
});
