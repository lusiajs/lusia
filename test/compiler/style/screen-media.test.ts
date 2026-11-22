import { describe, expect, test } from "bun:test";
import { compile } from "#compiler/index.ts";

const FILE = "/app/Grid.lusia";

function cssOf(markup: string, screens?: Record<string, number>): string {
  const source = `<script>\n  import { SCREEN } from "lusiajs";\n</script>\n\n<div class="grid"></div>\n${markup}`;
  return compile(source, FILE, { screens }).css.replace(/\s+/g, " ");
}

const style = (columns: number) => `<style>.grid { columns: ${columns}; }</style>`;

describe("<style> inside <IF {SCREEN.X}>", () => {
  test("a top-level style has no media query", () => {
    expect(cssOf(style(1))).not.toContain("@media");
  });

  test("IF, ELSEIF and ELSE each get their own width range", () => {
    const css = cssOf(
      `<IF {SCREEN.DESKTOP}>${style(3)}<ELSEIF {SCREEN.TABLET}>${style(2)}<ELSE>${style(1)}</IF>`,
    );
    expect(css).toContain("@media (min-width: 1000px) {");
    expect(css).toContain("@media (min-width: 600px) and (max-width: 999.98px) {");
    expect(css).toContain("@media (max-width: 599.98px) {");
  });

  test("ELSE after one size joins the neighbouring sizes into one range", () => {
    const css = cssOf(`<IF {SCREEN.DESKTOP}>${style(3)}<ELSE>${style(1)}</IF>`);
    expect(css).toContain("@media (max-width: 999.98px) {");
  });

  test("nested IFs narrow the range", () => {
    const css = cssOf(
      `<IF {SCREEN.REDUCED_MOTION}><IF {SCREEN.PHONE}>${style(1)}</IF></IF>`,
    );
    expect(css).toContain("@media (max-width: 599.98px) and (prefers-reduced-motion: reduce) {");
  });

  test("screens come from the options", () => {
    const css = cssOf(`<IF {SCREEN.WIDE}>${style(4)}</IF>`, { SMALL: 0, WIDE: 1400 });
    expect(css).toContain("@media (min-width: 1400px) {");
  });

  test("a condition that is not a SCREEN value is an error", () => {
    expect(() => cssOf(`<IF {open.value}>${style(1)}</IF>`)).toThrow(
      "<style> inside <IF {open.value}> needs a SCREEN condition",
    );
  });

  test("an unknown screen name lists the known ones", () => {
    expect(() => cssOf(`<IF {SCREEN.HUGE}>${style(1)}</IF>`)).toThrow(
      "SCREEN.HUGE is not a screen size",
    );
  });

  test("a style inside EACH is an error", () => {
    expect(() => cssOf(`<EACH {items} as={item}>${style(1)}</EACH>`)).toThrow(
      "<style> cannot be inside <EACH> or <FOR>",
    );
  });
});
