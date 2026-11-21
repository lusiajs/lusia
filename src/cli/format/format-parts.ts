import { format, resolveConfig, type Options } from "prettier";
import type { FormatParts } from "#language/format/format.ts";
import { prettierParts } from "#language/format/prettier-parts.ts";

export async function prettierConfigFor(file: string): Promise<Options> {
  return (await resolveConfig(file)) ?? {};
}

export function partsFor(config: Options, indentScriptAndStyle = true): FormatParts {
  return prettierParts(
    async () => ({
      format: (code, options) => format(code, options as Options),
    }),
    config as Record<string, unknown>,
    indentScriptAndStyle,
  ).parts;
}
