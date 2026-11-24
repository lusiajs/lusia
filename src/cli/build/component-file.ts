import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { findComponentImport } from "#language/parse/imports.ts";
import { parsePropDefs, type PropDef } from "#language/parse/props.ts";
import type { ChildSource, ChildSourceLookup } from "#language/lint/types.ts";
import { classTypeResolver } from "../lint/class-types.ts";
import type { ClassTypes } from "../lint/type-program.ts";

/** The file a component imports as `name`, or undefined when it is not imported or missing. */
function childFile(documentPath: string, text: string, name: string): string | undefined {
  const found = findComponentImport(text, name);
  if (!found) return undefined;
  const path = resolve(dirname(documentPath), found.specifier);
  return existsSync(path) ? path : undefined;
}

/** The props a component declares, or undefined when its file cannot be read. */
function declaredProps(
  documentPath: string,
  text: string,
  name: string,
): PropDef[] | undefined {
  const path = childFile(documentPath, text, name);
  return path ? parsePropDefs(readFileSync(path, "utf8")) : undefined;
}

/** The source of an imported component, with the lookups for its own imports and class types. */
export function childSourceLookup(
  documentPath: string,
  text: string,
  classTypes: ClassTypes | undefined,
): ChildSourceLookup {
  const cache = new Map<string, ChildSource | undefined>();
  return (name) => {
    if (!cache.has(name)) cache.set(name, loadChild(documentPath, text, name, classTypes));
    return cache.get(name);
  };
}

function loadChild(
  documentPath: string,
  text: string,
  name: string,
  classTypes: ClassTypes | undefined,
): ChildSource | undefined {
  const path = childFile(documentPath, text, name);
  if (!path) return undefined;
  const source = readFileSync(path, "utf8");
  return {
    path,
    source,
    childSource: childSourceLookup(path, source, classTypes),
    resolveClassType: classTypeResolver(classTypes, path, source),
  };
}

export function childPropsLookup(
  documentPath: string,
  text: string,
): (name: string) => PropDef[] | undefined {
  const cache = new Map<string, PropDef[] | undefined>();
  return (name) => {
    if (!cache.has(name)) cache.set(name, declaredProps(documentPath, text, name));
    return cache.get(name);
  };
}
