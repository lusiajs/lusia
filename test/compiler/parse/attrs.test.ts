import { describe, expect, test } from "bun:test";
import { parseAttrs } from "#compiler/parse/attrs.ts";
import { parse } from "#compiler/parse/sections.ts";

const FILE = "Card.lusia";

describe("parseAttrs", () => {
  test("parses valued and bare attributes on sections", () => {
    const parsed = parse('<style lang="css">a {}</style>', FILE);
    expect(parsed.styles[0]?.attrs).toEqual({ lang: "css" });
    expect(parsed.script).toBeNull();
  });

  test("bare attributes get an empty value", () => {
    expect(parseAttrs(' lang="css" scoped')).toEqual({ lang: "css", scoped: "" });
  });
});
