import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { Options } from "prettier";
import { cacheFolder } from "../build/cache-file.ts";

/** Bump when the formatter itself changes, so old results are not reused. */
const CACHE_VERSION = 1;
const MAX_ENTRIES = 20000;

type CacheDecision = "clean" | "changed" | "unknown";

interface Entry {
  config: string;
  source: string;
  formatted: string;
}

interface CacheFile {
  tool: string;
  files: Record<string, Entry>;
}

export interface FormatCache {
  decide(file: string, source: string, config: Options): CacheDecision;
  record(file: string, source: string, formatted: string, config: Options): void;
  save(): void;
}

/** The cache of the current folder; a broken or missing file just means no cache. */
export function openFormatCache(cwd: string): FormatCache | undefined {
  const path = cachePath(cwd);
  const tool = toolVersion();
  const files = new Map<string, Entry>(Object.entries(readEntries(path, tool)));
  const seen = new Set<string>();
  return {
    decide(file, source, config) {
      const entry = files.get(file);
      if (entry === undefined || entry.config !== configHash(config)) return "unknown";
      const content = hash(source);
      if (content === entry.formatted) return "clean";
      if (content === entry.source) return "changed";
      return "unknown";
    },
    record(file, source, formatted, config) {
      seen.add(file);
      files.set(file, {
        config: configHash(config),
        source: hash(source),
        formatted: hash(formatted),
      });
    },
    save() {
      saveEntries(path, tool, files, seen);
    },
  };
}

function cachePath(cwd: string): string {
  if (existsSync(join(cwd, "node_modules"))) {
    return join(cacheFolder(cwd), "format.json");
  }
  return join(tmpdir(), "lusia-format", `${hash(cwd)}.json`);
}

function toolVersion(): string {
  return `lusia-format:${CACHE_VERSION}:${Bun.version}:${prettierVersion()}`;
}

const require = createRequire(import.meta.url);

function prettierVersion(): string {
  try {
    const packageJson = require("prettier/package.json") as {
      version?: string;
    };
    return packageJson.version ?? "0";
  } catch {
    return "0";
  }
}

function readEntries(path: string, tool: string): Record<string, Entry> {
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as CacheFile;
    if (parsed.tool !== tool || typeof parsed.files !== "object") return {};
    return parsed.files;
  } catch {
    return {};
  }
}

function saveEntries(
  path: string,
  tool: string,
  files: Map<string, Entry>,
  seen: Set<string>,
): void {
  try {
    const kept = files.size > MAX_ENTRIES ? keptEntries(files, seen) : [...files];
    const data: CacheFile = { tool, files: Object.fromEntries(kept) };
    mkdirSync(dirname(path), { recursive: true });
    const temporary = `${path}.${process.pid}.tmp`;
    writeFileSync(temporary, JSON.stringify(data));
    renameSync(temporary, path);
  } catch {
    // The cache is an optimization only; a read-only folder just turns it off.
  }
}

function keptEntries(files: Map<string, Entry>, seen: Set<string>): Array<[string, Entry]> {
  return [...files].filter(([file]) => seen.has(file));
}

function hash(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 32);
}

function configHash(config: Options): string {
  return hash(JSON.stringify(config ?? {}));
}
