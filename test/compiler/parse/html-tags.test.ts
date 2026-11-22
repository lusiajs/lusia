import { describe, expect, test } from "bun:test";
import { HTML_TAGS } from "#compiler/parse/html-tags.ts";

describe("HTML_TAGS", () => {
  test("has standard, obsolete, SVG and MathML names", () => {
    for (const name of ["button", "center", "marquee", "svg", "foreignObject", "math"]) {
      expect(HTML_TAGS.has(name.toLowerCase())).toBe(true);
    }
  });

  test("stores names in lowercase", () => {
    expect(HTML_TAGS.has("foreignObject")).toBe(false);
    expect(HTML_TAGS.has("foreignobject")).toBe(true);
  });

  test("does not have component-style names", () => {
    for (const name of ["row", "myThing", "card-list"]) {
      expect(HTML_TAGS.has(name)).toBe(false);
    }
  });
});
