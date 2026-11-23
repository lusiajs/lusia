import type { Options } from "prettier";
import { lusiaError } from "#compiler/errors/create.ts";
import type { FormatParts } from "#language/format/format.ts";
import { prettierParts } from "#language/format/prettier-parts.ts";

export type Prettier = typeof import("prettier");

type ImportPrettier = () => Promise<Prettier>;

export async function loadPrettier(
  importPrettier: ImportPrettier = () => import("prettier"),
): Promise<Prettier> {
  try {
    return await importPrettier();
  } catch (error) {
    if (isMissingPackage(error)) throw lusiaError("L3005");
    throw error;
  }
}

export async function prettierConfigFor(prettier: Prettier, file: string): Promise<Options> {
  return (await prettier.resolveConfig(file)) ?? {};
}

export function partsFor(
  prettier: Prettier,
  config: Options,
  indentScriptAndStyle = true,
): FormatParts {
  return prettierParts(
    async () => ({
      format: (code, options) => prettier.format(code, options as Options),
    }),
    config as Record<string, unknown>,
    indentScriptAndStyle,
  ).parts;
}

function isMissingPackage(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ERR_MODULE_NOT_FOUND"
  );
}
