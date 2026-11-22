import type { CompiledStyle } from "./style-compile.ts";

export type { CompiledStyle } from "./style-compile.ts";

// Sass needs Node. In the browser SCSS is not compiled, so unused-class stays quiet on it.
export function compileLintScss(_content: string, _file: string | undefined): CompiledStyle | undefined {
  return undefined;
}

export function lintStyleCurrent(_style: CompiledStyle): boolean {
  return true;
}
