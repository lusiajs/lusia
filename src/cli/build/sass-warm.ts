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
import { loadStyleCache } from "./sass-disk-cache.ts";

const SKIPPED_FOLDERS = new Set(["node_modules", "dist"]);

interface StyleJob {
  file: string;
  index: number;
  style: Section;
}

/** Loads the saved Sass cache, then compiles every uncached style in parallel. Returns the time taken. */
export async function prepareStyles(root: string, screens: Screens): Promise<number> {
  const start = performance.now();
  await loadStyleCache(root);
  await warmStyles(root, screens);
  return performance.now() - start;
}

/** Fills the Sass cache for every style under root, so the sync compile finds them cached. */
export async function warmStyles(root: string, screens: Screens): Promise<number> {
  const start = performance.now();
  const files = await lusiaFiles(root);
  const jobs = (await Promise.all(files.map((file) => styleJobs(file, screens)))).flat();
  if (jobs.length > 0) await compileJobs(jobs, screens);
  return performance.now() - start;
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

async function styleJobs(file: string, screens: Screens): Promise<StyleJob[]> {
  try {
    const source = await readFile(file, "utf8");
    return parse(source, file).styles.flatMap((style, index) =>
      needsCompile(file, index, style, screens) ? [{ file, index, style }] : [],
    );
  } catch {
    return [];
  }
}

function needsCompile(file: string, index: number, style: Section, screens: Screens): boolean {
  return style.attrs.lang !== "css" && !isStyleCached(file, index, style, screens);
}

async function compileJobs(jobs: StyleJob[], screens: Screens): Promise<void> {
  const compiler = await startCompiler();
  try {
    await Promise.all(jobs.map((job) => compileJob(compiler, job, screens)));
  } finally {
    await compiler.dispose();
  }
}

// sass-embedded is loaded only when a style misses the cache.
async function startCompiler(): Promise<AsyncCompiler> {
  const { initAsyncCompiler } = await import("sass-embedded");
  return initAsyncCompiler();
}

async function compileJob(compiler: AsyncCompiler, job: StyleJob, screens: Screens): Promise<void> {
  try {
    const result = await compiler.compileStringAsync(
      scssSource(job.style),
      sassOptions(job.file, screens),
    );
    const deps = await readDeps(loadedFilePaths(result.loadedUrls));
    primeStyle(job.file, job.index, job.style, screens, result.css, deps);
  } catch {
    // The sync compile reports this error with its position.
  }
}

async function readDeps(paths: string[]): Promise<StyleDep[]> {
  return Promise.all(paths.map(async (path) => ({ path, text: await readFile(path, "utf8") })));
}
