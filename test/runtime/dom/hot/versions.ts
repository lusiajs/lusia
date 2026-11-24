import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { compile } from "#compiler/index.ts";
import type { HotComponent } from "lusiajs/internal";

const VERSIONS = join(import.meta.dir, ".versions");

let sequence = 0;

/**
 * Compiles `source` as the component `name`, the way the dev server does on an edit, and loads it.
 * Every version of one name shares a file id, so a later version swaps the earlier one.
 */
export async function version(name: string, source: string): Promise<HotComponent> {
  await mkdir(VERSIONS, { recursive: true });
  const logical = join(VERSIONS, `${name}.lusia`);
  const { code } = compile(source, logical, { dev: true });
  const path = join(VERSIONS, `${name}.${++sequence}.ts`);
  await writeFile(path, code);
  return (await import(path)).default as HotComponent;
}

/** Writes a `.lusia` file that compiled modules can import by relative path. */
export async function sourceFile(name: string, source: string): Promise<void> {
  await mkdir(VERSIONS, { recursive: true });
  await writeFile(join(VERSIONS, `${name}.lusia`), source);
}

export async function removeVersions(): Promise<void> {
  await rm(VERSIONS, { recursive: true, force: true });
}
