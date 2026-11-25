import { describe, expect, test } from "bun:test";
import { parse } from "#compiler/parse/sections.ts";

function codeOf(source: string): string | undefined {
  try {
    parse(source, "Card.lusia");
  } catch (error) {
    return (error as { code?: string }).code;
  }
  return undefined;
}

describe("<FALLBACK>", () => {
  test("its content is kept apart from the markup, and its line is kept", () => {
    const parsed = parse(
      "<script>\nconst a = 1;\n</script>\n<FALLBACK>\n  <p>Loading</p>\n</FALLBACK>\n<main>{a}</main>\n",
      "Card.lusia",
    );
    expect(parsed.fallback?.content).toBe("\n  <p>Loading</p>\n");
    expect(parsed.fallback?.line).toBe(4);
    expect(parsed.markup).not.toContain("Loading");
    expect(parsed.markup).toContain("<main>");
  });

  test("works in a file with no script", () => {
    const parsed = parse("<FALLBACK>wait</FALLBACK>\n<p>Done</p>", "Card.lusia");
    expect(parsed.fallback?.content).toBe("wait");
    expect(parsed.markup).toBe("<p>Done</p>");
  });

  test("is optional", () => {
    expect(parse("<p>Done</p>", "Card.lusia").fallback).toBeNull();
  });

  test("a line break after a removed marker keeps the line numbers of the markup after it", () => {
    const parsed = parse("<FALLBACK>x</FALLBACK>\n\n<p>{a}</p>", "Card.lusia");
    expect(parsed.markupLine).toBe(3);
  });

  test("cannot sit inside another element", () => {
    expect(codeOf("<div>\n<FALLBACK>x</FALLBACK>\n</div>")).toBe("L1038");
  });

  test("can only be used once", () => {
    expect(codeOf("<FALLBACK>a</FALLBACK>\n<FALLBACK>b</FALLBACK>")).toBe("L1039");
  });

  test("needs its closing tag", () => {
    expect(codeOf("<FALLBACK>a")).toBe("L1001");
  });

  test("cannot hold an expression", () => {
    expect(codeOf("<FALLBACK>Loading {count}</FALLBACK>")).toBe("L1042");
  });

  test("cannot hold an event", () => {
    expect(codeOf("<FALLBACK><button onclick={go}>x</button></FALLBACK>")).toBe("L1042");
  });

  test("cannot hold a component or a flow tag", () => {
    expect(codeOf("<FALLBACK><Chart /></FALLBACK>")).toBe("L1042");
    expect(codeOf("<FALLBACK><IF>x</IF></FALLBACK>")).toBe("L1042");
  });
});

describe("<NO_LAZY />", () => {
  test("is removed from the markup and sets nolazy", () => {
    const parsed = parse("<NO_LAZY />\n<p>Hi</p>", "Card.lusia");
    expect(parsed.nolazy).toBe(true);
    expect(parsed.markup).toBe("<p>Hi</p>");
  });

  test("works in a file with no script", () => {
    expect(parse("<NO_LAZY />", "Card.lusia").nolazy).toBe(true);
  });

  test("is false when absent", () => {
    expect(parse("<p>Hi</p>", "Card.lusia").nolazy).toBe(false);
  });

  test("cannot sit inside another element", () => {
    expect(codeOf("<div><NO_LAZY /></div>")).toBe("L1038");
  });

  test("can only be used once", () => {
    expect(codeOf("<NO_LAZY />\n<NO_LAZY />")).toBe("L1040");
  });

  test("takes no children", () => {
    expect(codeOf("<NO_LAZY>x</NO_LAZY>")).toBe("L1041");
  });

  test("the old <NOLAZY /> spelling is an error at the top level", () => {
    expect(codeOf("<NOLAZY />\n<p>Hi</p>")).toBe("L1050");
  });
});
