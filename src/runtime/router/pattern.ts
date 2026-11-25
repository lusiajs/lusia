export type Params = Record<string, string>;

/** Drops trailing slashes. The root stays "/". */
export function normalizePath(path: string): string {
  const trimmed = path.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

export function isParamSegment(part: string): boolean {
  return part.startsWith(":");
}

// A segment from a URL can be malformed. Keep the raw text then instead of throwing.
export function decodePart(text: string): string {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

/** The values of `:name` segments when the path matches the pattern, or undefined. "*" matches any path. */
export function matchPattern(pattern: string, path: string): Params | undefined {
  if (pattern === "*") return {};
  const wanted = normalizePath(pattern).split("/");
  const actual = normalizePath(path).split("/");
  if (wanted.length !== actual.length) return undefined;
  const params: Params = {};
  for (let index = 0; index < wanted.length; index++) {
    const part = wanted[index] ?? "";
    const value = actual[index] ?? "";
    if (isParamSegment(part)) {
      if (value === "") return undefined;
      params[part.slice(1)] = decodePart(value);
    } else if (part !== value) {
      return undefined;
    }
  }
  return params;
}
