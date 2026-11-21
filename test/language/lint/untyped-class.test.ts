import { describe, expect, test } from "bun:test";
import { lintLusia } from "#language/lint/lint.ts";
import type { ClassTypeResolver } from "#compiler/style/markup.ts";

const NO_PROPS = () => undefined;

const UNUSED_STYLE = "<style>\n.unused { color: red; }\n</style>\n";

function lintWith(source: string, resolveClassType: ClassTypeResolver | undefined) {
  return lintLusia(source, NO_PROPS, { resolveClassType });
}

describe("untyped-class", () => {
  test("a literal union value marks its classes used and gives no warning", () => {
    const source = `<script>\nimport { tone } from "./palette.ts";\n</script>\n<style>\n.odd { color: red; }\n.even { color: blue; }\n</style>\n<li class="cell {tone}"></li>`;
    const resolve: ClassTypeResolver = () => ["odd", "even"];
    expect(lintWith(source, resolve)).toEqual([]);
  });

  test("a wide value gets an untyped-class warning at its expression, and unused-class stays silent", () => {
    const source = `<script>\nimport { label } from "./palette.ts";\n</script>\n${UNUSED_STYLE}<p class={label}></p>`;
    const resolve: ClassTypeResolver = () => ({ wide: "string" });
    const issues = lintWith(source, resolve);
    expect(issues.map((issue) => [issue.code, issue.line])).toEqual([["untyped-class", 7]]);
    expect(issues[0]?.message).toBe(
      'Can\'t tell which classes "label" adds. Its type is string, so it could be any class. Type it as a union, e.g. "odd" | "even", or add // @on-purpose.',
    );
  });

  test("without a resolver (no TypeScript) the value stays unknown: no untyped-class and no unused-class", () => {
    const source = `<script>\nimport { label } from "./palette.ts";\n</script>\n${UNUSED_STYLE}<p class={label}></p>`;
    expect(lintWith(source, undefined)).toEqual([]);
  });

  test("an unresolved name keeps unused-class silent", () => {
    const source = `<script>\nimport { label } from "./palette.ts";\n</script>\n${UNUSED_STYLE}<p class={label}></p>`;
    const resolve: ClassTypeResolver = () => undefined;
    expect(lintWith(source, resolve)).toEqual([]);
  });

  test("@on-purpose in a markup block comment skips untyped-class and keeps unused-class silent", () => {
    const source = `<script>\nimport { tone } from "./palette.ts";\n</script>\n${UNUSED_STYLE}<li class="cell {tone /* @on-purpose */}"></li>`;
    const resolve: ClassTypeResolver = () => ({ wide: "string" });
    expect(lintWith(source, resolve)).toEqual([]);
  });

  test("@on-purpose in a markup line comment skips untyped-class and keeps unused-class silent", () => {
    const source = `<script>\nimport { tone } from "./palette.ts";\n</script>\n${UNUSED_STYLE}<li class={tone // @on-purpose\n}></li>`;
    const resolve: ClassTypeResolver = () => ({ wide: "string" });
    expect(lintWith(source, resolve)).toEqual([]);
  });
});
