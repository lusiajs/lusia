import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { childSourceLookup } from "#cli/build/component-file.ts";
import { classTypeResolver } from "#cli/lint/class-types.ts";
import { loadClassTypes } from "#cli/lint/type-program.ts";
import { lintLusia } from "#language/lint/lint.ts";

const PAGE = join(import.meta.dir, "fixtures/class-types/page.lusia");
const STYLE = "<style>\n.odd { color: red; }\n.even { color: blue; }\n</style>\n";

async function lintPage(source: string) {
  const types = await loadClassTypes([{ path: PAGE, text: source }]);
  return lintLusia(source, () => undefined, {
    file: PAGE,
    resolveClassType: classTypeResolver(types, PAGE, source),
  });
}

describe("class types from TypeScript", () => {
  test("a literal union import marks its classes used, so only the other class is flagged", async () => {
    const source = `<script>\nimport { tone } from "./palette.ts";\n</script>\n${STYLE}<li class="cell {tone}"></li>`;
    const withOther = source.replace("</style>", ".other { color: red; }\n</style>");
    const issues = await lintPage(withOther);
    expect(issues.map((issue) => issue.message)).toEqual([
      '".other" is not used. No element in this component or its child components has this class.',
    ]);
  });

  test("a wide string import gets an untyped-class warning", async () => {
    const source = `<script>\nimport { label } from "./palette.ts";\n</script>\n${STYLE}<li class={label}></li>`;
    const issues = await lintPage(source);
    expect(issues.map((issue) => issue.code)).toEqual(["untyped-class"]);
    expect(issues[0]?.message).toContain("Its type is string,");
  });

  test("a value with get and value is read as its value type", async () => {
    const source = `<script>\nimport { shade } from "./palette.ts";\n</script>\n${STYLE}<li class={shade}></li>`;
    const types = await loadClassTypes([{ path: PAGE, text: source }]);
    expect(classTypeResolver(types, PAGE, source)?.("shade", 0)).toEqual(["odd", "even"]);
  });

  test("a child's union import marks the root's tree class used", async () => {
    const source = `<script>\nimport Child from "./child.lusia";\n</script>\n<style>\n.odd { color: red; }\n.other { color: red; }\n</style>\n<Child />`;
    const types = await loadClassTypes([{ path: PAGE, text: source }]);
    const issues = lintLusia(
      source,
      () => undefined,
      { file: PAGE, resolveClassType: classTypeResolver(types, PAGE, source) },
      childSourceLookup(PAGE, source, types),
    );
    expect(issues.map((issue) => issue.message)).toEqual([
      '".other" is not used. No element in this component or its child components has this class.',
    ]);
  });

  test("without TypeScript a child's classes stay unknown, so the root stays silent", () => {
    const source = `<script>\nimport Child from "./child.lusia";\n</script>\n<style>\n.odd { color: red; }\n.other { color: red; }\n</style>\n<Child />`;
    const issues = lintLusia(
      source,
      () => undefined,
      { file: PAGE },
      childSourceLookup(PAGE, source, undefined),
    );
    expect(issues).toEqual([]);
  });

  test("a missing TypeScript gives no resolver", () => {
    expect(classTypeResolver(undefined, PAGE, "")).toBeUndefined();
  });
});
