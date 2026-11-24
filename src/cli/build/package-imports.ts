import type { BunPlugin } from "bun";
import { dirname, isAbsolute, resolve, sep } from "node:path";
import { RUNTIME_SPECIFIER } from "./runtime-shim.ts";

const NODE_MODULES = `${sep}node_modules${sep}`;
const NOT_BARE = /^[./#]/;
// A URL such as `https:` in a CSS `@import` is not a package.
const URL_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const BUILT_IN = /^(node:|bun(:|$))/;
const LUSIA = /^lusiajs(\/|$)/;

/** A package name or subpath, such as `sass`, `@codemirror/view` or `@codemirror/lang-css`. */
export function isPackageSpecifier(specifier: string): boolean {
  if (NOT_BARE.test(specifier) || URL_SCHEME.test(specifier)) return false;
  if (BUILT_IN.test(specifier) || LUSIA.test(specifier)) return false;
  return specifier !== RUNTIME_SPECIFIER;
}

/** A resolved path is a package when it sits in node_modules or outside the app folder (a linked package). */
export function isPackagePath(path: string, root: string): boolean {
  return path.includes(NODE_MODULES) || !path.startsWith(`${root}${sep}`);
}

/**
 * Records each bare import the app makes, with the file that makes it. Imports made from inside
 * node_modules are left to the package bundle.
 */
export function collectPackageImports(found: Map<string, string>): BunPlugin {
  return {
    name: "lusia-package-imports",
    setup(build) {
      build.onResolve({ filter: /^[^./#]/ }, ({ path, importer }) => {
        if (isPackageSpecifier(path) && isAppImporter(importer) && !found.has(path)) {
          found.set(path, importer);
        }
        return undefined;
      });
    },
  };
}

type Inputs = Record<string, { imports: { path: string; original?: string }[] }>;

/**
 * The file each collected package resolves to, so the package bundle uses the same file as the app
 * (the browser build, for example). The app build's metafile gives it, except for a dynamic import,
 * which points at a chunk; that one is resolved from the importing folder. Only package files are kept.
 */
export function resolvedPackages(
  found: Map<string, string>,
  inputs: Inputs,
  root: string,
): Map<string, string> {
  const files = filesFromMetafile(found, inputs);
  for (const [specifier, importer] of found) {
    if (files.has(specifier)) continue;
    const file = resolveOrUndefined(specifier, importer);
    if (file !== undefined) files.set(specifier, file);
  }
  return new Map([...files].filter(([, file]) => isPackagePath(file, root)));
}

function filesFromMetafile(found: Map<string, string>, inputs: Inputs): Map<string, string> {
  const files = new Map<string, string>();
  for (const [importer, input] of Object.entries(inputs)) {
    const from = resolve(importer);
    for (const imported of input.imports) {
      const specifier = imported.original;
      if (specifier === undefined || found.get(specifier) !== from) continue;
      if (!Object.hasOwn(inputs, imported.path) || files.has(specifier)) continue;
      files.set(specifier, resolve(imported.path));
    }
  }
  return files;
}

function resolveOrUndefined(specifier: string, importer: string): string | undefined {
  try {
    return Bun.resolveSync(specifier, dirname(importer));
  } catch {
    return undefined;
  }
}

function isAppImporter(importer: string): boolean {
  return isAbsolute(importer) && !importer.includes(NODE_MODULES);
}
