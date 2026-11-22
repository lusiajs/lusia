import { describe, expect, test } from "bun:test";
import { compile } from "#compiler/index.ts";
import { compileForBrowser } from "#compiler/browser.ts";

const FILE = "/app/Card.lusia";

function cssOf(style: string, screens?: Record<string, number>): string {
  const source = `<script>\n  const label = "card";\n</script>\n\n<p class="card">card</p>\n\n<style>\n${style}\n</style>\n`;
  return compile(source, FILE, { screens }).css.replace(/\s+/g, " ");
}

describe("screen() mixin", () => {
  test("wraps the content in the media query of one screen", () => {
    const css = cssOf(".card { color: red; }\n@include screen(PHONE) { .card { color: blue; } }");
    expect(css).toContain("@media (max-width: 599.98px) {");
    expect(css).toContain("color: blue;");
  });

  test("several names give one media query with a list", () => {
    const css = cssOf("@include screen(PHONE, DESKTOP) { .card { color: blue; } }");
    expect(css).toContain("@media (max-width: 599.98px), (min-width: 1000px) {");
  });

  test("a quoted name works too", () => {
    expect(cssOf('@include screen("TABLET") { .card { color: blue; } }')).toContain(
      "@media (min-width: 600px) and (max-width: 999.98px) {",
    );
  });

  test("works after a @use rule at the top of the style", () => {
    const css = cssOf('@use "sass:math";\n@include screen(DESKTOP) { .card { color: blue; } }');
    expect(css).toContain("@media (min-width: 1000px) {");
  });

  test("uses the sizes from the config", () => {
    const css = cssOf("@include screen(WIDE) { .card { color: blue; } }", {
      SMALL: 0,
      WIDE: 1400,
    });
    expect(css).toContain("@media (min-width: 1400px) {");
  });

  test("an unknown name is an error that lists the screens", () => {
    expect(() => cssOf("@include screen(HUGE) { .card { color: blue; } }")).toThrow(
      "Unknown screen HUGE. Use one of: PHONE, TABLET, DESKTOP",
    );
  });

  test("an error on a later line keeps its line number", () => {
    const style = ".card { color: red; }\n@include screen(HUGE) { .card { color: blue; } }";
    expect(() => cssOf(style)).toThrow("Unknown screen HUGE");
    const line = (() => {
      try {
        cssOf(style);
      } catch (error) {
        return (error as { line?: number }).line;
      }
    })();
    expect(line).toBe(9);
  });

  test("a change to the sizes is not hidden by the Sass cache", () => {
    const style = "@include screen(WIDE) { .card { color: blue; } }";
    expect(cssOf(style, { SMALL: 0, WIDE: 1400 })).toContain("@media (min-width: 1400px) {");
    expect(() => cssOf(style)).toThrow("Unknown screen WIDE");
  });

  test("the browser build has the mixin too", () => {
    const source = `<p class="card">card</p>\n\n<style>\n@include screen(DESKTOP) { .card { color: blue; } }\n</style>\n`;
    const { code } = compileForBrowser(source, FILE);
    expect(code).toContain("@media (min-width: 1000px)");
  });
});
