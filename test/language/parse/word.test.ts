import { describe, expect, test } from "bun:test";
import { dottedNameAt } from "#language/parse/word.ts";

describe("dottedNameAt", () => {
  const text = "x = EASE.STYLE.QUART;";

  test("covers the whole dotted name from any of its segments", () => {
    const expected = { name: "EASE.STYLE.QUART", start: 4, end: 20 };
    for (const offset of [4, 8, 9, 14, 15, 20]) {
      expect(dottedNameAt(text, offset)).toEqual(expected);
    }
  });

  test("trims a trailing dot", () => {
    expect(dottedNameAt("count.", 6)).toEqual({ name: "count", start: 0, end: 5 });
  });

  test("stops at a character that is not part of the name", () => {
    expect(dottedNameAt("call(EASE.OUT)", 8)).toEqual({ name: "EASE.OUT", start: 5, end: 13 });
    expect(dottedNameAt("EASE", 2)).toEqual({ name: "EASE", start: 0, end: 4 });
    expect(dottedNameAt("1 + 2", 0)).toEqual({ name: "1", start: 0, end: 1 });
  });

  test("returns nothing on punctuation", () => {
    expect(dottedNameAt("()", 1)).toBeUndefined();
    expect(dottedNameAt("", 0)).toBeUndefined();
  });
});
