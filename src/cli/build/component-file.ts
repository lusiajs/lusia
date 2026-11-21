import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { findComponentImport } from "#language/parse/imports.ts";
import { parsePropDefs, type PropDef } from "#language/parse/props.ts";
import type { ChildSource, ChildSourceLookup } from "#language/lint/types.ts";

/** The file a component imports as `name`, or undefined when it is not imported or missing. */
export function childFile(documentPath: string, text: string, name: string): string | undefined {
  const found = findComponentImport(text, name);
  if (!found) return undefined;
  const path = resolve(dirname(documentPath), found.specifier);
  return existsSync(path) ? path : undefined;
}

/** The props a component declares, or undefined when its file cannot be read. */
export function declaredProps(
  documentPath: string,
  text: string,
  name: string,
): PropDef[] | undefined {
  const path = childFile(documentPath, text, name);
  return path ? parsePropDefs(readFileSync(path, "utf8")) : undefined;
}

/** The source of an imported component, with the same lookup for its own imports. */
export function childSourceLookup(documentPath: string, text: string): ChildSourceLookup {
  const cache = new Map<string, ChildSource | undefined>();
  return (name) => {
    if (!cache.has(name)) cache.set(name, loadChild(documentPath, text, name));
    return cache.get(name);
  };
}

function loadChild(documentPath: string, text: string, name: string): ChildSource | undefined {
  const path = childFile(documentPath, text, name);
  if (!path) return undefined;
  const source = readFileSync(path, "utf8");
  return { path, source, childSource: childSourceLookup(path, source) };
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
