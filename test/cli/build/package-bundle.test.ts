import { describe, expect, test } from "bun:test";
import { packageEntrySource, packageFileName } from "#cli/build/package-bundle.ts";

describe("packageFileName", () => {
  test("a plain package keeps its name", () => {
    expect(packageFileName("sass")).toBe("sass.js");
  });

  test("a scoped package joins scope and name with two underscores", () => {
    expect(packageFileName("@codemirror/lang-css")).toBe("codemirror__lang-css.js");
  });

  test("a subpath keeps its folders", () => {
    expect(packageFileName("prismjs/components/prism-json.js")).toBe(
      "prismjs__components__prism-json.js.js",
    );
  });
});

describe("packageEntrySource", () => {
  test("re-exports the named exports and the default export", () => {
    const source = packageEntrySource("@codemirror/view");
    expect(source).toContain('export * from "@codemirror/view";');
    expect(source).toContain("export default namespace.default;");
  });

  test("the name is quoted, so a name with quotes stays valid", () => {
    const source = packageEntrySource('odd"name');
    expect(source).toContain('"odd\\"name"');
  });
});
