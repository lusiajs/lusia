import { existsSync } from "node:fs";
import { readdir, rm, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { Command } from "../args/command.ts";
import { CACHE_FOLDER, cacheFolder } from "../build/cache-file.ts";
import { formatSize } from "../log/size.ts";

type CleanCommand = Extract<Command, { name: "clean" }>;

/** Deletes the app's disk caches. Only the `.lusia/cache` folder is removed. */
export async function runClean(command: CleanCommand): Promise<number> {
  const folder = cacheFolder(resolve(command.dir));
  if (!existsSync(folder)) {
    printLine(command, "nothing to clean");
    return 0;
  }
  const bytes = await folderBytes(folder);
  await rm(folder, { recursive: true, force: true });
  printLine(command, `removed ${CACHE_FOLDER} (${formatSize(bytes)})`);
  return 0;
}

function printLine(command: CleanCommand, text: string): void {
  if (!command.quiet) process.stdout.write(`${text}\n`);
}

async function folderBytes(folder: string): Promise<number> {
  const entries = await readdir(folder, { withFileTypes: true });
  const sizes = await Promise.all(
    entries.map((entry) => entrySize(join(folder, entry.name), entry.isDirectory())),
  );
  return sizes.reduce((total, size) => total + size, 0);
}

async function entrySize(path: string, isFolder: boolean): Promise<number> {
  return isFolder ? folderBytes(path) : (await stat(path)).size;
}
