// A line that starts with a tag, or a script or style block, means the example is lusia markup.
const MARKUP_PATTERN = /^\s*<[A-Za-z!/]|<(script|style)\b/m;

export function exampleLanguage(example: string): "lusia" | "ts" {
  return MARKUP_PATTERN.test(example) ? "lusia" : "ts";
}
