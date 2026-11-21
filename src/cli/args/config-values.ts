import { closestName } from "#runtime/animate/options/closest.ts";
import { LusiaError } from "#compiler/errors/error.ts";
import { CONFIG_FILES } from "./config-types.ts";

export type JsonObject = Record<string, unknown>;

export function isRoute(route: string): boolean {
  return route.startsWith("/") && !route.includes("..");
}

export function optionalString(root: JsonObject, key: string): string | undefined {
  const value = root[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value === "") throw configError(`"${key}" must be text`);
  return value;
}

export function optionalBoolean(root: JsonObject, key: string): boolean | undefined {
  const value = root[key];
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") throw configError(`"${key}" must be true or false`);
  return value;
}

export function oneOf<const T extends readonly string[]>(
  value: unknown,
  allowed: T,
  key: string,
): T[number] | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "string" && allowed.includes(value)) return value;
  throw configError(`"${key}" must be one of: ${allowed.join(", ")}`);
}

export function asObject(value: unknown, detail: string): JsonObject {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    throw configError(detail);
  return value as JsonObject;
}

export function checkKeys(object: JsonObject, allowed: readonly string[], parent?: string): void {
  for (const key of Object.keys(object)) {
    if (allowed.includes(key)) continue;
    const where = parent ? ` in "${parent}"` : "";
    const list = allowed.join(", ");
    throw configError(`unknown key "${key}"${where}, allowed: ${list}${suggestion(key, allowed)}`);
  }
}

function suggestion(key: string, allowed: readonly string[]): string {
  const near = closestName(key, allowed);
  return near === undefined ? "" : `. Did you mean "${near}"?`;
}

/** A problem in the file's content. The file name is added where the file is read. */
export function configError(detail: string): Error {
  return new Error(detail);
}

export function configFileError(file: string, error: unknown): LusiaError {
  const detail = error instanceof Error ? error.message : String(error);
  return fileError(`${file}: ${detail}`, `Fix ${file}, then run the command again.`);
}

export function bothFilesError(): LusiaError {
  return fileError(
    `${CONFIG_FILES.join(" and ")} both exist, use one config file`,
    "Remove one of the two files, then run the command again.",
  );
}

function fileError(message: string, hint: string): LusiaError {
  return new LusiaError(message, undefined, undefined, undefined, { code: "L3004", hint });
}
