import { describe, expect, test } from "bun:test";
import { hoverAt, type HoverResult } from "../../src/editor/hover.ts";
import { hoverMarkdown } from "../../src/editor/markdown.ts";
import type { SymbolLookup } from "../../src/editor/script/imported-symbols.ts";
import type { ScriptSymbol } from "../../src/editor/script/symbols.ts";

const noProps = () => [];

function apiId(result: HoverResult | undefined): string | undefined {
  return result?.kind === "api" ? result.entry.id : undefined;
}

describe("hover", () => {
  test("shows the API entry for a name in the script", () => {
    const text = "<script>\nconst s = variable(0);\n</script>";
    expect(apiId(hoverAt(text, text.indexOf("variable") + 2, noProps))).toBe("variable");
  });

  test("shows the scoped style entry on a style tag", () => {
    const text = "<style scoped>\n.a {}\n</style>";
    expect(apiId(hoverAt(text, text.indexOf("scoped") + 1, noProps))).toBe("style-scoped");
  });

  test("shows the @scoped entry in a style body", () => {
    const text = "<style>\n@scoped { .a {} }\n</style>";
    expect(apiId(hoverAt(text, text.indexOf("@scoped") + 2, noProps))).toBe("scoped");
  });

  test("shows the :global() entry in a style body", () => {
    const text = "<style>\n.a :global(b) {}\n</style>";
    expect(apiId(hoverAt(text, text.indexOf(":global") + 3, noProps))).toBe("inline-global");
  });

  test("shows a component's props with defaults on its tag", () => {
    const text = `<script>\nimport Badge from "./badge.lusia";\n</script>\n<Badge />`;
    const lookup = () => [{ name: "label", defaultValue: '"New"' }];
    const result = hoverAt(text, text.lastIndexOf("Badge") + 1, lookup);
    expect(result).toEqual({
      kind: "component",
      name: "Badge",
      props: [{ name: "label", defaultValue: '"New"' }],
    });
    expect(result && hoverMarkdown(result)).toContain('`label` = `"New"`');
  });

  test("shows nothing on plain text", () => {
    const text = "<p>hello</p>";
    expect(hoverAt(text, 4, noProps)).toBeUndefined();
  });

  test("shows the animate entry on the attribute name", () => {
    const text = "<div animate={fade}>x</div>";
    expect(apiId(hoverAt(text, text.indexOf("animate") + 1, noProps))).toBe("animate");
  });

  test("shows the options entry on the options key inside animate", () => {
    const text = "<div animate={{ play: fade, on: ON.VIEW, options: { reverse: true } }}>x</div>";
    expect(apiId(hoverAt(text, text.indexOf("options") + 1, noProps))).toBe("animate-options");
  });

  test("shows nothing for the word more outside animate", () => {
    const text = "<p>more</p>";
    expect(hoverAt(text, text.indexOf("more") + 1, noProps)).toBeUndefined();
  });

  test("shows nothing for the word animate in plain text", () => {
    const text = "<p>animate</p>";
    expect(hoverAt(text, 5, noProps)).toBeUndefined();
  });

  test("shows the CSS property under the cursor in a keyframe css object", () => {
    const text = "<div animate={{ animation: { 0: { opacity: 0 }, 1: { opacity: 1 } } }}>x</div>";
    expect(hoverAt(text, text.indexOf("opacity") + 2, noProps)).toEqual({
      kind: "css",
      name: "opacity",
    });
  });

  test("shows the enum entry for a name in the script", () => {
    const text = '<script>\nimport { EASE } from "lusiajs";\n</script>';
    expect(apiId(hoverAt(text, text.indexOf("EASE") + 2, noProps))).toBe("ease");
  });

  test("shows the enum entry for a member of a nested group in the script", () => {
    const text =
      '<script>\nimport { EASE } from "lusiajs";\nconst s = EASE.STYLE.QUART;\n</script>';
    expect(apiId(hoverAt(text, text.indexOf("QUART") + 2, noProps))).toBe("ease");
  });
});

describe("hover for markup features", () => {
  test("shows the IF entry on the tag name", () => {
    const text = "<IF {ok}>\n<p>x</p>\n</IF>";
    expect(apiId(hoverAt(text, 2, noProps))).toBe("if");
  });

  test("shows the EACH entry on the tag name", () => {
    const text = "<EACH {todos} as={todo}>\n</EACH>";
    expect(apiId(hoverAt(text, 3, noProps))).toBe("each");
  });

  test("shows the ELSE entry on its tag name", () => {
    const text = "<IF {ok}>\n<ELSE>\n</IF>";
    expect(apiId(hoverAt(text, text.lastIndexOf("ELSE") + 1, noProps))).toBe("else");
  });

  test("shows the event entry on an on-attribute", () => {
    const text = "<button onclick={go}>x</button>";
    expect(apiId(hoverAt(text, text.indexOf("onclick") + 3, noProps))).toBe("event");
  });

  test("shows the bind-value entry on bind-value", () => {
    const text = "<input bind-value={name} />";
    expect(apiId(hoverAt(text, text.indexOf("bind-value") + 1, noProps))).toBe("bind-value");
  });

  test("shows the bind-prop entry on a dashed bind attribute", () => {
    const text = "<input bind-checked={name} />";
    expect(apiId(hoverAt(text, text.indexOf("checked") + 1, noProps))).toBe("bind-prop");
  });

  test("shows the bind-element entry on bind-element", () => {
    const text = "<input bind-element={field} />";
    expect(apiId(hoverAt(text, text.indexOf("element") + 2, noProps))).toBe("bind-element");
  });

  test("shows the PRESET entry in the script", () => {
    const text =
      '<script>\nimport { PRESET } from "lusiajs";\n</script>\n<div animate={PRESET.FADE_IN}>x</div>';
    expect(apiId(hoverAt(text, text.indexOf("PRESET") + 2, noProps))).toBe("preset");
  });

  test("shows nothing on an on-word inside plain text", () => {
    const text = "<p>onclick</p>";
    expect(hoverAt(text, 6, noProps)).toBeUndefined();
  });
});

const ADD_SYMBOL: ScriptSymbol = {
  name: "add",
  kind: "function",
  signature: "function add(a: number): void",
  isDefault: false,
  doc: "Adds two numbers.",
  specifier: "./math.ts",
};
const symbolsOf: SymbolLookup = (specifier) => (specifier === "./math.ts" ? [ADD_SYMBOL] : []);

describe("hover for script names", () => {
  test("shows variable.compute on every segment, with the whole range", () => {
    const text = `<script>\nconst value = variable.compute(() => 0);\n</script>`;
    const start = text.indexOf("variable.compute");
    const end = start + "variable.compute".length;
    for (const offset of [start, start + 1, start + 8, start + 12, end]) {
      const result = hoverAt(text, offset, noProps);
      expect(apiId(result)).toBe("variable-compute");
      expect(result?.range).toEqual({ start, end });
    }
  });

  test("shows the enum entry on a nested member in a markup expression, with the whole range", () => {
    const text = "<p>{EASE.STYLE.QUART}</p>";
    const start = text.indexOf("EASE");
    const result = hoverAt(text, text.lastIndexOf("QUART") + 2, noProps);
    expect(apiId(result)).toBe("ease");
    expect(result?.range).toEqual({ start, end: start + "EASE.STYLE.QUART".length });
  });

  test("shows an imported symbol under its alias in the script", () => {
    const text = `<script>\nimport { add as sum } from "./math.ts";\nconst total = sum(1, 2);\n</script>`;
    const result = hoverAt(text, text.indexOf("sum") + 1, noProps, symbolsOf);
    expect(result).toMatchObject({ kind: "symbol", local: "sum" });
    if (result?.kind !== "symbol") throw new Error("expected a symbol");
    expect(result.symbol.name).toBe("add");
    const markdown = hoverMarkdown(result);
    expect(markdown).toContain("imported as `sum`");
    expect(markdown).toContain("function add(a: number): void");
    expect(markdown).toContain("Adds two numbers.");
  });

  test("shows an imported symbol in a markup expression", () => {
    const text = `<script>\nimport { add as sum } from "./math.ts";\n</script>\n<p>{sum}</p>`;
    const result = hoverAt(text, text.lastIndexOf("sum") + 1, noProps, symbolsOf);
    expect(result).toMatchObject({ kind: "symbol", local: "sum" });
    expect(hoverMarkdown(result!)).toContain("Adds two numbers.");
  });

  test("shows nothing on a plain local name", () => {
    const text = `<script>\nconst count = variable(0);\n</script>`;
    expect(hoverAt(text, text.indexOf("count") + 2, noProps)).toBeUndefined();
  });
});
