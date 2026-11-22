import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface SourcePlace {
  line: number;
  column: number;
  length: number;
}

export interface FilePlace extends SourcePlace {
  file: string;
}

const SOURCE_FILE = /\.(lusia|ts|js)$/;
const SKIPPED_FOLDERS = new Set(["node_modules", ".git", "dist", ".worktrees"]);

export function findImport(root: string, specifier: string): FilePlace | undefined {
  for (const file of sourceFiles(root)) {
    const place = findInSource(readText(file), specifier);
    if (place) return { file, ...place };
  }
  return undefined;
}

export function findInSource(source: string, specifier: string): SourcePlace | undefined {
  const quoted = [`"${specifier}"`, `'${specifier}'`];
  const lines = source.split("\n");
  for (let row = 0; row < lines.length; row++) {
    for (const text of quoted) {
      const index = lines[row]!.indexOf(text);
      if (index !== -1) return { line: row + 1, column: index + 1, length: text.length };
    }
  }
  return undefined;
}

function* sourceFiles(folder: string): Generator<string> {
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const path = join(folder, entry.name);
    if (entry.isDirectory() && !SKIPPED_FOLDERS.has(entry.name)) yield* sourceFiles(path);
    else if (entry.isFile() && SOURCE_FILE.test(entry.name)) yield path;
  }
}

function readText(file: string): string {
  try {
    return readFileSync(file, "utf8");
  } catch {
    return "";
  }
}
