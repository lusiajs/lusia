import { describe, expect, test } from "bun:test";
import { format, type Options } from "prettier";
import { prettierParts } from "#language/format/prettier-parts.ts";

const { parts } = prettierParts(async () => ({
  format: (code, options) => format(code, options as Options),
}));

const CHAIN = "<IF {a}>\n  <p>A</p>\n<ELSEIF {b}>\n  <p>B</p>\n<ELSE>\n  <p>other</p>\n</IF>";

const NESTED = [
  "<IF {a}>",
  "  <IF {b}>",
  "    <p>x</p>",
  "  <ELSE>",
  "    <IF {c}>",
  "      <p>y</p>",
  "    <ELSE>",
  "      <p>z</p>",
  "    </IF>",
  "  </IF>",
  "  <p>after</p>",
  "</IF>",
].join("\n");

describe("flow chains in markup", () => {
  test("the new form keeps its shape", async () => {
    expect(await parts.markup(CHAIN)).toBe(CHAIN);
  });

  test("formatting the new form twice gives the same output", async () => {
    const messy = "<IF {a}>\n<p>A</p>\n<ELSEIF {b}>\n<p>B</p>\n<ELSE>\n<p>other</p>\n</IF>";
    const once = await parts.markup(messy);
    expect(await parts.markup(once)).toBe(once);
  });

  test("branches inside nested IFs keep their own chain", async () => {
    expect(await parts.markup(NESTED)).toBe(NESTED);
  });

  test("the old form is converted to the new form", async () => {
    const old =
      "<IF {a}>\n  <p>A</p>\n</IF>\n<ELSEIF {b}>\n  <p>B</p>\n</ELSEIF>\n<ELSE>\n  <p>other</p>\n</ELSE>";
    expect(await parts.markup(old)).toBe(CHAIN);
  });

  test("a chain inside a paragraph is left as written", async () => {
    const source = "<p><IF {a}>x<ELSE>y</IF></p>";
    expect(await parts.markup(source)).toBe(source);
  });
});
