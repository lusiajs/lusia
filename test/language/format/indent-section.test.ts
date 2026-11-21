import { describe, expect, test } from "bun:test";
import { indentSection } from "#language/format/indent-section.ts";
import { formatLusia } from "#language/format/format.ts";
import type { FormatParts } from "#language/format/format.ts";

const echo = async (code: string) => code.trim();
const parts = (sectionIndent: string): FormatParts => ({
  script: echo,
  style: echo,
  markup: echo,
  sectionIndent,
});

describe("indentSection", () => {
  test("indents every non-blank line", () => {
    expect(indentSection("a\n\nb", "  ")).toBe("  a\n\n  b");
  });

  test("leaves the text of a multi-line template literal alone", () => {
    expect(indentSection("const a = `x\ny`;\nb", "\t")).toBe("\tconst a = `x\ny`;\n\tb");
  });

  test("an empty unit changes nothing", () => {
    expect(indentSection("a\nb", "")).toBe("a\nb");
  });
});

describe("formatLusia section indent", () => {
  const source = "<script>\nconst a = 1;\n</script>\n";

  test("indents script and style content", async () => {
    expect(await formatLusia(source, parts("  "))).toBe("<script>\n  const a = 1;\n</script>\n");
  });

  test("no indent keeps content flush", async () => {
    expect(await formatLusia(source, parts(""))).toBe(source);
  });
});
