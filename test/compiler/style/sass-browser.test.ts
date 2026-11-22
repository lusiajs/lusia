import { describe, expect, test } from "bun:test";
import type { Importer } from "sass";
import { compileScssText } from "#compiler/style/sass-browser.ts";

const themeImporter: Importer = {
  canonicalize: (url) => (url === "theme" ? new URL("memory:theme") : null),
  load: () => ({ contents: "$pink: #f0a;", syntax: "scss" }),
};

describe("compileScssText", () => {
  test("compiles with only the caller's importers, because the screen module is built in", () => {
    const css = compileScssText('@use "theme";\n.a { color: theme.$pink; }', "theme.scss", [themeImporter]);
    expect(css).toContain("color: #f0a");
  });

  test("the screen() mixin works with no importers at all", () => {
    const css = compileScssText(".a { @include screen(PHONE) { color: red; } }", "a.scss", []);
    expect(css).toContain("@media (max-width: 599.98px)");
  });

  test("custom screens change the mixin", () => {
    const css = compileScssText(".a { @include screen(WIDE) { color: red; } }", "a.scss", [], 1, {
      SMALL: 0,
      WIDE: 1400,
    });
    expect(css).toContain("@media (min-width: 1400px)");
  });
});
