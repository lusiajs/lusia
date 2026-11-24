import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_OUTDIR } from "../args/settings.ts";

export interface IgnoreRules {
  patterns: IgnorePattern[];
}

interface IgnorePattern {
  regex: RegExp;
  negated: boolean;
  folderOnly: boolean;
  anchored: boolean;
}

const ALWAYS_IGNORED = new Set(["node_modules", ".lusia", ".git"]);
const GLOB_TOKEN = /(\*\*\/|\*\*|\*|\?)/;
const GLOB_TOKEN_SOURCE = new Map([
  ["**/", "(?:.*/)?"],
  ["**", ".*"],
  ["*", "[^/]*"],
  ["?", "[^/]"],
]);
const REGEX_SPECIAL = /[.+^${}()|[\]\\]/g;

// Without a .gitignore, dot folders and the default output folder stay skipped, as before.
const DEFAULT_IGNORE = `.*\n/${DEFAULT_OUTDIR}/\n`;

/** Reads `<root>/.gitignore`, or the default rules when there is none. */
export function readIgnore(root: string): IgnoreRules {
  return { patterns: parseLines(readGitignore(root) ?? DEFAULT_IGNORE) };
}

/** Tells whether a path (relative to the app root, with `/` separators) is ignored. */
export function isIgnoredPath(
  rules: IgnoreRules,
  relativePath: string,
  isFolder: boolean,
): boolean {
  const segments = relativePath.split("/");
  if (segments.some((segment) => ALWAYS_IGNORED.has(segment))) return true;
  if (isInsideIgnoredFolder(rules, segments)) return true;
  return isEntryIgnored(rules, segments, segments.length, isFolder);
}

function readGitignore(root: string): string | undefined {
  try {
    return readFileSync(join(root, ".gitignore"), "utf8");
  } catch {
    return undefined;
  }
}

function parseLines(text: string): IgnorePattern[] {
  return text.split(/\r?\n/).flatMap((line) => {
    const pattern = parseLine(line);
    return pattern ? [pattern] : [];
  });
}

function parseLine(raw: string): IgnorePattern | undefined {
  const line = raw.trim();
  if (line === "" || line.startsWith("#")) return undefined;
  const negated = line.startsWith("!");
  const body = negated ? line.slice(1) : line;
  const folderOnly = body.endsWith("/");
  const withoutSlash = folderOnly ? body.slice(0, -1) : body;
  const anchored = withoutSlash.includes("/");
  const glob = withoutSlash.replace(/^\//, "");
  if (glob === "") return undefined;
  return { regex: new RegExp(`^${globSource(glob)}$`), negated, folderOnly, anchored };
}

function globSource(glob: string): string {
  return glob.split(GLOB_TOKEN).map(tokenSource).join("");
}

function tokenSource(piece: string): string {
  return GLOB_TOKEN_SOURCE.get(piece) ?? piece.replace(REGEX_SPECIAL, "\\$&");
}

function isInsideIgnoredFolder(rules: IgnoreRules, segments: string[]): boolean {
  return segments
    .slice(0, -1)
    .some((_segment, index) => isEntryIgnored(rules, segments, index + 1, true));
}

// The last matching pattern wins, so a later `!` line can re-include an entry.
function isEntryIgnored(
  rules: IgnoreRules,
  segments: string[],
  depth: number,
  isFolder: boolean,
): boolean {
  const name = segments[depth - 1]!;
  const fullPath = segments.slice(0, depth).join("/");
  let ignored = false;
  for (const pattern of rules.patterns) {
    if (pattern.folderOnly && !isFolder) continue;
    if (pattern.regex.test(pattern.anchored ? fullPath : name)) ignored = !pattern.negated;
  }
  return ignored;
}
