import { describe, expect, test } from "bun:test";
import type { Importer } from "sass";
import { compileForBrowser, LusiaError } from "#compiler/browser.ts";

describe("compileForBrowser", () => {
  test("removes the TypeScript from the script", () => {
    const source = `<script>\nconst count: number = 1;\n</script>\n<p>{count}</p>\n`;
    const { code } = compileForBrowser(source, "App.lusia");
    expect(code).not.toContain(": number");
    expect(code).toContain("export default");
  });

  test("compiles a Sass style with the importers it is given", () => {
    const tone: Importer = {
      canonicalize: (url) => new URL(`file:///${url}.scss`),
      load: () => ({ contents: "$fg: red;", syntax: "scss" }),
    };
    const source = `<style>\n@use "tone" as t;\n.card { color: t.$fg; }\n</style>\n<p class="card">Hi</p>\n`;
    const { code } = compileForBrowser(source, "App.lusia", { importers: [tone] });
    expect(code).toContain("color: red");
  });

  test("keeps plain CSS styles as written", () => {
    const source = `<style lang="css">\n.card { color: red; }\n</style>\n<p class="card">Hi</p>\n`;
    expect(compileForBrowser(source, "App.lusia").code).toContain("color: red");
  });

  test("points a script syntax error at its line in the source", () => {
    const source = `<script>\nconst a = 1;\nconst b = ;\n</script>\n<p>{a}</p>\n`;
    let thrown: unknown;
    try {
      compileForBrowser(source, "App.lusia");
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(LusiaError);
    expect((thrown as LusiaError).line).toBe(3);
  });
});
