import * as sass from "sass";
import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { depsCurrent, type StyleDep } from "#compiler/style/sass.ts";

export interface CompiledStyle {
  css: string;
  deps: StyleDep[];
}

export function compileLintScss(content: string, file: string | undefined): CompiledStyle | undefined {
  try {
    const result = sass.compileString(content, {
      loadPaths: file ? [dirname(file)] : [],
      style: "expanded",
      logger: sass.Logger.silent,
    });
    return { css: result.css, deps: result.loadedUrls.map(readDep) };
  } catch {
    return undefined;
  }
}

export function lintStyleCurrent(style: CompiledStyle): boolean {
  return depsCurrent(style.deps);
}

function readDep(url: URL): StyleDep {
  const path = fileURLToPath(url);
  return { path, text: readFileSync(path, "utf8") };
}
