import { describe, expect, test } from "bun:test";
import { completionsAt } from "#integrations/vscode-support/completions.ts";
import type { SymbolLookup } from "#integrations/vscode-support/script/imported-symbols.ts";
import type { ScriptSymbol } from "#integrations/vscode-support/script/symbols.ts";

const noProps = () => [];
const BADGE_SCRIPT = `<script>\nimport Badge from "./badge.lusia";\n</script>\n`;

describe("script completions", () => {
  const text = "<script>\n\n</script>";
  const items = completionsAt(text, 9, noProps);

  test("offers lusia API names with an auto-import edit", () => {
    const variable = items.find((item) => item.label === "variable");
    expect(variable?.importEdit).toEqual({
      start: 8,
      end: 8,
      text: 'import { variable } from "lusiajs";\n',
    });
  });

  test("a dotted name is offered, and imports its lusia export", () => {
    const from = items.find((item) => item.label === "variable.compute");
    expect(from?.insertText).toBe("variable.compute");
    expect(from?.importEdit).toEqual({
      start: 8,
      end: 8,
      text: 'import { variable } from "lusiajs";\n',
    });
  });

  test("offers the props snippet", () => {
    const props = items.find((item) => item.label === "props({ ... })");
    expect(props?.snippet).toBe(true);
    expect(props?.insertText.startsWith("props({")).toBe(true);
  });

  test("offers onAttach, which is a lusia export", () => {
    const onAttach = items.find((item) => item.label === "onAttach");
    expect(onAttach?.importEdit).toEqual({
      start: 8,
      end: 8,
      text: 'import { onAttach } from "lusiajs";\n',
    });
  });
});

describe("markup completions", () => {
  test("offers imported component names after <", () => {
    const text = `${BADGE_SCRIPT}\n<`;
    const badge = completionsAt(text, text.length, noProps).find((item) => item.label === "Badge");
    expect(badge?.insertText).toBe("Badge $1/>");
  });

  test("offers the child's props on its tag", () => {
    const text = `${BADGE_SCRIPT}\n<Badge `;
    const lookup = () => [{ name: "label", defaultValue: '"New"' }];
    const labels = completionsAt(text, text.length, lookup).map((item) => item.label);
    expect(labels).toEqual(["label"]);
  });

  test("offers style attributes on a style tag", () => {
    const text = "<style ";
    const labels = completionsAt(text, text.length, noProps).map((item) => item.label);
    expect(labels).toEqual(["scoped", "global", 'lang="css"']);
  });

  test("offers animate and the events on a plain HTML tag", () => {
    const text = "<p ";
    const labels = completionsAt(text, text.length, noProps).map((item) => item.label);
    expect(labels).toEqual([
      "animate",
      "onclick",
      "oninput",
      "onchange",
      "onsubmit",
      "onkeydown",
      "onfocus",
      "onblur",
      "on:view",
      "on:scroll",
      "on:size",
      "on:click-outside",
      "bind-element",
    ]);
  });

  test("inserts animate with a keyframes expression", () => {
    const text = "<div ";
    const animate = completionsAt(text, text.length, noProps).find(
      (item) => item.label === "animate",
    );
    expect(animate).toMatchObject({
      insertText: "animate={$1}",
      snippet: true,
      kind: "keyword",
    });
  });
});

describe("motion completions", () => {
  test("offers the EASE and ON enums in the script, with an auto-import edit", () => {
    const text = "<script>\n\n</script>";
    const items = completionsAt(text, 9, noProps);
    const ease = items.find((item) => item.label === "EASE");
    expect(ease).toMatchObject({
      kind: "variable",
      importEdit: { text: 'import { EASE } from "lusiajs";\n' },
    });
    expect(items.find((item) => item.label === "ON")?.kind).toBe("variable");
    expect(items.find((item) => item.label === "CURVE")).toBeUndefined();
  });

  test("completes the curves after EASE.STYLE., with EASE imported", () => {
    const text = "<script>\n\n</script>\n<p>{EASE.STYLE.QU";
    const items = completionsAt(text, text.length, noProps);
    expect(items.map((item) => item.label)).toEqual([
      "LINEAR",
      "QUAD",
      "CUBIC",
      "QUART",
      "QUINT",
      "SINE",
      "EXPO",
      "CIRC",
      "BACK",
      "ELASTIC",
      "BOUNCE",
    ]);
    expect(items[0]?.importEdit?.text).toBe('import { EASE } from "lusiajs";\n');
  });

  test("completes the members after ON. in markup", () => {
    const text = `${BADGE_SCRIPT}<div animate={{ on: ON.`;
    expect(completionsAt(text, text.length, noProps).map((item) => item.label)).toEqual([
      "ATTACH",
      "DETACH",
      "VIEW",
      "HOVER",
      "SCROLL",
      "MOVE",
      "RESIZE",
      "MOVE_OR_RESIZE",
      "MANUAL",
      "MOUSE_MOVE",
    ]);
  });

  test("offers the more keys of VIEW after on: ON.VIEW", () => {
    const text = "<div animate={{ on: ON.VIEW, options: { ";
    expect(completionsAt(text, text.length, noProps).map((item) => item.label)).toEqual([
      "margin",
      "amount",
      "reverse",
    ]);
  });

  test("offers animateSpace after on: ON.DETACH", () => {
    const text = "<div animate={{ on: ON.DETACH, options: { ";
    expect(completionsAt(text, text.length, noProps).map((item) => item.label)).toEqual([
      "animateSpace",
    ]);
  });

  test("offers the HOVER keys after on: ON.HOVER, and the SCROLL keys after ON.SCROLL", () => {
    const hover = "<div animate={{ on: ON.HOVER, options: { ";
    const scroll = "<div animate={{ on: ON.SCROLL, options: { ";
    expect(completionsAt(hover, hover.length, noProps).map((item) => item.label)).toEqual([
      "inDelay",
      "outDelay",
      "out",
      "outDuration",
      "area",
    ]);
    expect(completionsAt(scroll, scroll.length, noProps).map((item) => item.label)).toEqual([
      "start",
      "end",
      "follow",
      "part",
    ]);
  });

  test("completes TOP, CENTER and BOTTOM after EDGE.", () => {
    const text = "<script>\n\n</script>\nx = EDGE.";
    expect(completionsAt(text, text.length, noProps).map((item) => item.label)).toEqual([
      "TOP",
      "CENTER",
      "BOTTOM",
    ]);
  });

  test("completes STYLE, IN, OUT and INOUT after EASE.", () => {
    const text = "<script>\n\n</script>\nx = EASE.";
    expect(completionsAt(text, text.length, noProps).map((item) => item.label)).toEqual([
      "STYLE",
      "IN",
      "OUT",
      "INOUT",
    ]);
  });

  test("completes VIEW, SCROLL, SIZE and CLICK_OUTSIDE after EVENT.", () => {
    const text = "<script>\n\n</script>\nx = EVENT.";
    expect(completionsAt(text, text.length, noProps).map((item) => item.label)).toEqual([
      "VIEW",
      "SCROLL",
      "SIZE",
      "CLICK_OUTSIDE",
    ]);
  });

  test("offers the camelCase style properties inside a keyframe css object", () => {
    const text = "<div animate={{ play: { 0: { ";
    const labels = completionsAt(text, text.length, noProps).map((item) => item.label);
    expect(labels).toContain("opacity");
    expect(labels).toContain("backgroundColor");
    expect(labels).not.toContain("length");
    expect(labels).not.toContain("cssText");
  });

  test("offers the style properties after an ease in a key", () => {
    const text = "<div animate={{ play: { 1: [EASE.OUT, { ";
    expect(completionsAt(text, text.length, noProps).map((item) => item.label)).toContain(
      "translate",
    );
  });

  test("offers the keyframes ease key inside a play object", () => {
    const text = "<div animate={{ play: { ";
    expect(completionsAt(text, text.length, noProps).map((item) => item.label)).toEqual(["ease"]);
  });

  test("offers the item keys inside an animate object", () => {
    const text = "<div animate={[{ ";
    const labels = completionsAt(text, text.length, noProps).map((item) => item.label);
    expect(labels).toEqual([
      "play",
      "on",
      "glide",
      "control",
      "once",
      "options",
      "midway",
      "keep",
      "duration",
      "delay",
      "loop",
      "backAndForth",
    ]);
  });

  test("offers the MIDWAY enum after midway.", () => {
    const after = "<div animate={{ midway: MIDWAY.";
    expect(completionsAt(after, after.length, noProps).map((item) => item.label)).toEqual([
      "SWITCH",
      "SWITCH_SMOOTH",
      "SWITCH_STOP",
      "WAIT",
      "RESTART",
      "JUMP_TO_END",
      "KEEP_CURRENT",
    ]);
    const value = "<div animate={{ midway: ";
    expect(completionsAt(value, value.length, noProps).map((item) => item.label)).toEqual([
      "MIDWAY",
    ]);
  });

  test("offers the midway keys inside a midway object", () => {
    const text = "<div animate={{ midway: { ";
    expect(completionsAt(text, text.length, noProps).map((item) => item.label)).toEqual([
      "mode",
      "duration",
      "ease",
    ]);
  });

  test("offers the item keys right after the expression brace", () => {
    const text = "<div animate={{ pl";
    expect(completionsAt(text, text.length, noProps).map((item) => item.label)).toContain("play");
  });

  test("offers style properties, not item keys, in a keyframes object", () => {
    const text = "<div animate={{ 0: [QUART, IN, { ";
    const labels = completionsAt(text, text.length, noProps).map((item) => item.label);
    expect(labels).toContain("opacity");
    expect(labels).not.toContain("on");
    expect(labels).not.toContain("once");
  });

  test("offers the ON enum after on:, with an auto-import edit", () => {
    const text = `${BADGE_SCRIPT}<div animate={{ play: fade, on: `;
    const items = completionsAt(text, text.length, noProps);
    expect(items.map((item) => item.label)).toEqual(["ON"]);
    expect(items[0]?.importEdit).toBeDefined();
  });

  test("offers nothing inside an expression that is not an animate object", () => {
    const text = "<div animate={fade}>{ ";
    expect(completionsAt(text, text.length, noProps).map((item) => item.label)).not.toContain(
      "play",
    );
  });
});

describe("style completions", () => {
  test("offers block keywords in a style body", () => {
    const text = "<style>\n  \n</style>";
    const labels = completionsAt(text, 10, noProps).map((item) => item.label);
    expect(labels).toEqual(["@scoped", "@global", ":global()"]);
  });
});

describe("flow and element completions", () => {
  test("offers the flow tags after <, as snippets", () => {
    const text = `${BADGE_SCRIPT}\n<`;
    const flow = completionsAt(text, text.length, noProps).filter(
      (item) => item.kind === "keyword" && item.snippet,
    );
    expect(flow.map((item) => item.label)).toEqual([
      "IF",
      "ELSEIF",
      "ELSE",
      "EACH",
      "FOR",
      "CONTENT",
      "HTML",
      "FALLBACK",
      "NO_LAZY",
      "NO_SSR",
    ]);
    expect(flow.find((item) => item.label === "IF")?.insertText).toBe("IF {$1}>\n\t$0\n</IF>");
  });

  test("offers as, index and key inside EACH", () => {
    const text = "<EACH {todos} ";
    expect(completionsAt(text, text.length, noProps).map((item) => item.label)).toEqual([
      "as",
      "index",
      "key",
    ]);
  });

  test("offers from, to and step inside FOR", () => {
    const text = "<FOR {i} ";
    expect(completionsAt(text, text.length, noProps).map((item) => item.label)).toEqual([
      "from",
      "to",
      "step",
    ]);
  });

  test("offers no attributes inside IF", () => {
    const text = "<IF ";
    expect(completionsAt(text, text.length, noProps)).toEqual([]);
  });

  test("offers the events and bind-element on a plain tag", () => {
    const text = "<button ";
    expect(completionsAt(text, text.length, noProps).map((item) => item.label)).toEqual([
      "animate",
      "onclick",
      "oninput",
      "onchange",
      "onsubmit",
      "onkeydown",
      "onfocus",
      "onblur",
      "on:view",
      "on:scroll",
      "on:size",
      "on:click-outside",
      "bind-element",
    ]);
  });

  test("adds bind-value and bind-checked on form controls", () => {
    const text = "<input ";
    const labels = completionsAt(text, text.length, noProps).map((item) => item.label);
    expect(labels).toContain("bind-value");
    expect(labels).toContain("bind-checked");
    expect(labels).not.toContain("bind");
  });

  test("the event completion inserts a handler expression", () => {
    const text = "<button ";
    const onclick = completionsAt(text, text.length, noProps).find(
      (item) => item.label === "onclick",
    );
    expect(onclick).toMatchObject({
      insertText: "onclick={$1}",
      snippet: true,
    });
  });
});

describe("script member completions", () => {
  const memberLabels = (script: string, marker: string) => {
    const text = `${script}</script>`;
    return completionsAt(text, text.indexOf(marker) + marker.length, noProps).map(
      (item) => item.label,
    );
  };

  test("offers the variable members after count.", () => {
    const text = `<script>\nconst count = variable(0);\ncount.</script>`;
    const offset = text.indexOf("count.") + "count.".length;
    const items = completionsAt(text, offset, noProps);
    expect(items.map((item) => item.label)).toEqual(["value", "get", "set", "peek", "onUpdate"]);
    expect(items.find((item) => item.label === "set")).toMatchObject({
      insertText: "set($0)",
      snippet: true,
      kind: "function",
    });
    expect(items.find((item) => item.label === "onUpdate")).toMatchObject({
      insertText: "onUpdate($0)",
      snippet: true,
      entryId: "variable-instance-on-update",
    });
  });

  test("offers no set() or onUpdate() on a computed variable", () => {
    const labels = memberLabels(
      `<script>\nconst double = variable.compute(() => 0);\ndouble.`,
      "double.",
    );
    expect(labels).toEqual(["value", "get", "peek"]);
  });

  test("offers set() but no onUpdate() on a prop", () => {
    const labels = memberLabels(
      `<script>\nconst { label } = props({ label: "x" });\nlabel.`,
      "label.",
    );
    expect(labels).toEqual(["value", "get", "set", "peek"]);
  });

  test("offers the namespaced variable functions after variable.", () => {
    const text = `<script>\nvariable.</script>`;
    const items = completionsAt(text, text.indexOf("variable.") + "variable.".length, noProps);
    expect(items.map((item) => item.label)).toEqual(["compute", "autoRun", "watch"]);
    expect(items[0]).toMatchObject({
      kind: "function",
      insertText: "compute",
      entryId: "variable-compute",
      detail: "variable.compute<T>(fn: () => T): ComputedVariable<T>",
    });
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
const WIDGET_SYMBOL: ScriptSymbol = {
  name: "Widget",
  kind: "interface",
  signature: "interface Widget",
  isDefault: false,
  doc: "A widget.",
  specifier: "./math.ts",
};
const PANEL_SYMBOL: ScriptSymbol = {
  name: "default",
  kind: "class",
  signature: "default class Panel",
  isDefault: true,
  doc: "",
  specifier: "./panel.ts",
};
const symbolsOf: SymbolLookup = (specifier) => {
  if (specifier === "./math.ts") return [ADD_SYMBOL, WIDGET_SYMBOL];
  if (specifier === "./panel.ts") return [PANEL_SYMBOL];
  return [];
};

describe("script name completions", () => {
  const script = `<script>\nimport { add as sum, type Widget } from "./math.ts";\nimport make from "./panel.ts";\n</script>`;
  const items = completionsAt(script, script.indexOf("</script>"), noProps, symbolsOf);

  test("offers a named import under its alias, with its signature and docs", () => {
    const sum = items.find((item) => item.label === "sum");
    expect(sum).toMatchObject({
      kind: "function",
      insertText: "sum",
      detail: "function add(a: number): void",
      documentation: "Adds two numbers.",
    });
    expect(sum?.importEdit).toBeUndefined();
  });

  test("offers a type-only import as a type", () => {
    expect(items.find((item) => item.label === "Widget")).toMatchObject({
      kind: "type",
      documentation: "A widget.",
    });
  });

  test("offers a default import from the default export", () => {
    expect(items.find((item) => item.label === "make")).toMatchObject({
      kind: "class",
      detail: "default class Panel",
    });
  });

  test("keeps offering the local names", () => {
    const local = `<script>\nconst count = variable(0);\nfunction reset() {}\n</script>`;
    const localItems = completionsAt(local, local.indexOf("</script>"), noProps);
    expect(localItems.find((item) => item.label === "count")).toMatchObject({
      kind: "variable",
      insertText: "count",
      detail: "In this file",
    });
    expect(localItems.find((item) => item.label === "reset")?.kind).toBe("function");
    expect(localItems.find((item) => item.label === "count")?.importEdit).toBeUndefined();
  });

  test("offers the imported and local names inside a markup expression", () => {
    const markup = `<script>\nimport { add } from "./math.ts";\nconst count = variable(0);\n</script>\n<p>{co`;
    const labels = completionsAt(markup, markup.length, noProps, symbolsOf).map(
      (item) => item.label,
    );
    expect(labels).toEqual(["add", "count"]);
  });

  test("lets an API item win over an import with the same label", () => {
    const imported = `<script>\nimport { variable } from "./math.ts";\n</script>`;
    const variableSymbols: SymbolLookup = () => [{ ...ADD_SYMBOL, name: "variable" }];
    const found = completionsAt(
      imported,
      imported.indexOf("</script>"),
      noProps,
      variableSymbols,
    ).filter((item) => item.label === "variable");
    expect(found).toHaveLength(1);
    expect(found[0]?.importEdit).toBeDefined();
  });

  test("lets an import win over a local with the same label", () => {
    const shadowed = `<script>\nimport { add } from "./math.ts";\nconst add = 1;\n</script>`;
    const found = completionsAt(shadowed, shadowed.indexOf("</script>"), noProps, symbolsOf).filter(
      (item) => item.label === "add",
    );
    expect(found).toHaveLength(1);
    expect(found[0]?.detail).toBe("function add(a: number): void");
  });
});
