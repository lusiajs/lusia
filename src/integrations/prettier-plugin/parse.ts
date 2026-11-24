import type { ParserOptions } from "prettier";
import { formatLusia } from "#language/format/format.ts";
import { prettierParts } from "#language/format/prettier-parts.ts";

export interface LusiaParserOptions extends ParserOptions {
  lusiaIndentScriptAndStyle?: boolean;
}

export interface LusiaRoot {
  type: "root";
  formatted: string;
  end: number;
}

// The Prettier options that the embedded script, style and markup use.
const CONFIG_KEYS = [
  "printWidth",
  "tabWidth",
  "useTabs",
  "semi",
  "singleQuote",
  "trailingComma",
  "bracketSpacing",
] as const;

function formatConfig(options: LusiaParserOptions): Record<string, unknown> {
  const config: Record<string, unknown> = {};
  for (const key of CONFIG_KEYS) config[key] = options[key];
  return config;
}

export async function parseLusia(text: string, options: LusiaParserOptions): Promise<LusiaRoot> {
  const parts = prettierParts(
    () => import("prettier"),
    formatConfig(options),
    options.lusiaIndentScriptAndStyle,
  ).parts;
  const formatted = await formatLusia(text, parts);
  return { type: "root", formatted, end: text.length };
}
