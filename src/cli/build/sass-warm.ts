import { parse, type Section } from "#compiler/parse/sections.ts";
import {
  isStyleCached,
  loadedFilePaths,
  primeStyle,
  sassOptions,
  scssSource,
  type StyleDep,
} from "#compiler/style/sass.ts";
import type { Screens } from "#runtime/screen/screens.ts";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { AsyncCompiler } from "sass-embedded";
import type { StyleTiming } from "./build-report.ts";

const SKIPPED_FOLDERS = new Set(["node_modules", "dist"]);

interface StyleBlock extends StyleTiming {
  style: Section;
}

export interface StylePreparation {
  ms: number;
  blocks: StyleTiming[];
}

/** Compiles every style that is not in the Sass cache yet, in parallel. */
export async function prepareStyles(root: string, screens: Screens): Promise<StylePreparation> {
  const start = performance.now();
  const blocks = await warmStyles(root, screens);
  return { ms: performance.now() - start, blocks };
}

/** Fills the Sass cache for every style under root, so the sync compile finds them cached. */
export async function warmStyles(root: string, screens: Screens): Promise<StyleTiming[]> {
  const files = await lusiaFiles(root);
  const blocks = (await Promise.all(files.map((file) => styleBlocks(file, screens)))).flat();
  const misses = blocks.filter((block) => !block.cached);
  if (misses.length > 0) await compileBlocks(misses, screens);
  return blocks.map(({ file, index, cached, ms }) => ({ file, index, cached, ms }));
}

async function lusiaFiles(folder: string): Promise<string[]> {
  const entries = await readdir(folder, { withFileTypes: true });
  const found = await Promise.all(
    entries.map((entry) => {
      const path = join(folder, entry.name);
      if (entry.isDirectory()) return isWalkable(entry.name) ? lusiaFiles(path) : [];
      return entry.isFile() && entry.name.endsWith(".lusia") ? [path] : [];
    }),
  );
  return found.flat();
}

function isWalkable(name: string): boolean {
  return !SKIPPED_FOLDERS.has(name) && !name.startsWith(".");
}

async function styleBlocks(file: string, screens: Screens): Promise<StyleBlock[]> {
  try {
    const source = await readFile(file, "utf8");
    return parse(source, file).styles.flatMap((style, index) =>
      style.attrs.lang === "css" ? [] : [sassBlock(file, index, style, screens)],
    );
  } catch {
    return [];
  }
}

function sassBlock(file: string, index: number, style: Section, screens: Screens): StyleBlock {
  const cached = isStyleCached(file, index, style, screens);
  return { file, index, cached, ms: 0, style };
}

async function compileBlocks(blocks: StyleBlock[], screens: Screens): Promise<void> {
  const compiler = await startCompiler();
  try {
    await Promise.all(blocks.map((block) => compileBlock(compiler, block, screens)));
  } finally {
    await compiler.dispose();
  }
}

// sass-embedded is loaded only when a style misses the cache.
async function startCompiler(): Promise<AsyncCompiler> {
  const { initAsyncCompiler } = await import("sass-embedded");
  return initAsyncCompiler();
}

async function compileBlock(
  compiler: AsyncCompiler,
  block: StyleBlock,
  screens: Screens,
): Promise<void> {
  const start = performance.now();
  try {
    const result = await compiler.compileStringAsync(
      scssSource(block.style),
      sassOptions(block.file, screens),
    );
    const deps = await readDeps(loadedFilePaths(result.loadedUrls));
    primeStyle(block.file, block.index, block.style, screens, result.css, deps);
  } catch {
    // The sync compile reports this error with its position.
  } finally {
    block.ms = performance.now() - start;
  }
}

async function readDeps(paths: string[]): Promise<StyleDep[]> {
  return Promise.all(paths.map(async (path) => ({ path, text: await readFile(path, "utf8") })));
}
