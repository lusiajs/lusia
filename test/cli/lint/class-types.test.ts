import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { classTypeResolver, loadTypeScript } from "#cli/lint/class-types.ts";
import { lintLusia } from "#language/lint/lint.ts";

const PAGE = join(import.meta.dir, "fixtures/class-types/page.lusia");
const STYLE = "<style>\n.odd { color: red; }\n.even { color: blue; }\n</style>\n";

function lintPage(source: string, typeScript: Awaited<ReturnType<typeof loadTypeScript>>) {
  return lintLusia(source, () => undefined, {
    file: PAGE,
    resolveClassType: classTypeResolver(typeScript, PAGE, source),
  });
}

describe("class types from TypeScript", () => {
  test("a literal union import marks its classes used, so only the other class is flagged", async () => {
    const source = `<script>\nimport { tone } from "./palette.ts";\n</script>\n${STYLE}<li class="cell {tone}"></li>`;
    const withOther = source.replace("</style>", ".other { color: red; }\n</style>");
    const issues = lintPage(withOther, await loadTypeScript());
    expect(issues.map((issue) => issue.message)).toEqual([
      '".other" is not used. No element in this component or its child components has this class.',
    ]);
  });

  test("a wide string import gets an untyped-class warning", async () => {
    const source = `<script>\nimport { label } from "./palette.ts";\n</script>\n${STYLE}<li class={label}></li>`;
    const issues = lintPage(source, await loadTypeScript());
    expect(issues.map((issue) => issue.code)).toEqual(["untyped-class"]);
    expect(issues[0]?.message).toContain("Its type is string,");
  });

  test("a value with get and value is read as its value type", async () => {
    const source = `<script>\nimport { shade } from "./palette.ts";\n</script>\n${STYLE}<li class={shade}></li>`;
    const resolver = classTypeResolver(await loadTypeScript(), PAGE, source);
    expect(resolver?.("shade", 0)).toEqual(["odd", "even"]);
  });

  test("a missing TypeScript gives no resolver", () => {
    expect(classTypeResolver(undefined, PAGE, "")).toBeUndefined();
  });
});
