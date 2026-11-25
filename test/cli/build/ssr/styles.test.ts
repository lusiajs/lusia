import { describe, expect, test } from "bun:test";
import { sharedStyles, styleFileName, styleSheet } from "#cli/build/ssr/styles.ts";

describe("sharedStyles", () => {
  test("keeps one style per id, in first-seen order", () => {
    const styles = sharedStyles([
      [{ id: "b", css: "b1" }],
      [
        { id: "a", css: "a1" },
        { id: "b", css: "b2" },
      ],
    ]);
    expect(styles).toEqual([
      { id: "b", css: "b1" },
      { id: "a", css: "a1" },
    ]);
  });
});

describe("styleSheet", () => {
  test("puts a lusia marker before each style", () => {
    expect(styleSheet([{ id: "x", css: "p{}" }])).toBe("/* lusia:x */\np{}");
  });
});

describe("styleFileName", () => {
  test("is lusia- and an 8 character hash, and changes with the content", () => {
    const name = styleFileName("p{}");
    expect(name).toMatch(/^lusia-[0-9a-z]{8}\.css$/);
    expect(styleFileName("p{color:red}")).not.toBe(name);
    expect(styleFileName("p{}")).toBe(name);
  });
});
