import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  parse,
  splitImports,
  type ChildInfo,
  type LazyOptions,
  type LusiaImport,
} from "#compiler/index.ts";

export type LazySettings = Pick<LazyOptions, "mode" | "prefetch">;

const NO_CHILD: ChildInfo = { nolazy: false, fallback: false };
const infos = new Map<string, { source: string; info: ChildInfo }>();

/** Cached per path while the file's text is unchanged. */
export function childInfo(path: string): ChildInfo {
  if (!existsSync(path)) return NO_CHILD;
  const source = readFileSync(path, "utf8");
  const cached = infos.get(path);
  if (cached?.source === source) return cached.info;
  const info = readChildInfo(source, path);
  infos.set(path, { source, info });
  return info;
}

function readChildInfo(source: string, path: string): ChildInfo {
  try {
    const parsed = parse(source, path);
    return { nolazy: parsed.nolazy, fallback: parsed.fallback !== null };
  } catch {
    // The child's own build reports the error, so the importer just keeps it static.
    return NO_CHILD;
  }
}

/** The .lusia default imports of a file. A file that does not parse has none. */
export function lusiaImportsOf(source: string, path: string): LusiaImport[] {
  try {
    const { statements } = splitImports(parse(source, path).script, path);
    return statements.flatMap((statement) => (statement.lusia ? [statement.lusia] : []));
  } catch {
    return [];
  }
}

export function lazyOptionsFor(path: string, settings: LazySettings): LazyOptions {
  return {
    ...settings,
    childOf: (specifier) => childInfo(resolve(dirname(path), specifier)),
  };
}

/** Changes whenever a compile would differ: the settings, and what each imported child has. */
export function lazyKeyFor(
  path: string,
  source: string,
  settings: LazySettings | undefined,
): string {
  if (!settings) return "off";
  const children = lusiaImportsOf(source, path).map((item) =>
    childInfo(resolve(dirname(path), item.specifier)),
  );
  return JSON.stringify([settings.mode, settings.prefetch, children]);
}
