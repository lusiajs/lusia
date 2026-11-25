import { describe, expect, test } from "bun:test";
import { objectEntries } from "#language/format/object-literal.ts";
import { findPropsCall, parsePropDefs } from "#language/parse/props.ts";

describe("object entries", () => {
  test("splits top-level entries and ignores commas in strings", () => {
    expect(objectEntries("x({a: 1, b: 'c,d'})", 2)).toEqual(["a: 1", "b: 'c,d'"]);
  });

  test("keeps nested braces and strings together", () => {
    expect(objectEntries(`({ a: { b: "}" }, c: [1, 2] })`, 1)).toEqual([
      `a: { b: "}" }`,
      "c: [1, 2]",
    ]);
  });
});

describe("parsePropDefs", () => {
  test("reads names, types and default text", () => {
    const source = `const { label, tone, user, count } = props(class {
  label = "New";
  tone: "info" | "warn" = "info";
  user: User | null = null;
  count?: number;
});`;
    expect(parsePropDefs(source)).toEqual([
      { name: "label", defaultValue: '"New"' },
      { name: "tone", type: '"info" | "warn"', defaultValue: '"info"', choices: ["info", "warn"] },
      { name: "user", type: "User | null", defaultValue: "null" },
      { name: "count", type: "number", optional: true },
    ]);
  });

  test("reads a whole .lusia file through its script", () => {
    const source = `<script>\nconst { label } = props(class {\n  label = "New";\n});\n</script>\n<b>{label}</b>`;
    expect(parsePropDefs(source)).toEqual([{ name: "label", defaultValue: '"New"' }]);
  });

  test("keeps nested generics and object defaults together", () => {
    const source = `const p = props(class {
  items: Map<string, Array<number>> = new Map();
  opts = { a: "}", b: [1, 2] };
});`;
    expect(parsePropDefs(source)).toEqual([
      { name: "items", type: "Map<string, Array<number>>", defaultValue: "new Map()" },
      { name: "opts", defaultValue: '{ a: "}", b: [1, 2] }' },
    ]);
  });

  test("skips comments, methods, getters and static members", () => {
    const source = `const { label, tone } = props(class {
  // not a prop
  label = "New"; /* also not */ tone = "info" // trailing
  static shared = 1;
  get size() { return 1; }
  format() { return "x"; }
});`;
    expect(parsePropDefs(source).map((prop) => prop.name)).toEqual(["label", "tone"]);
    expect(parsePropDefs(source)[0]).toEqual({ name: "label", defaultValue: '"New"' });
  });

  test("returns nothing without a props() call", () => {
    expect(parsePropDefs("const x = { label: 1 };")).toEqual([]);
  });
});

describe("findPropsCall", () => {
  test("finds a destructured call and its names", () => {
    const script = `const a = 1;\nlet { label, count } = props(class {\n  label = "New";\n  count?: number;\n});\nconst b = 2;`;
    const call = findPropsCall(script);
    expect(call?.names).toEqual(["label", "count"]);
    expect(call?.binding).toEqual({ kind: "destructure", names: ["label", "count"] });
    expect(script.slice(call!.start, call!.end)).toBe(
      'let { label, count } = props(class {\n  label = "New";\n  count?: number;\n})',
    );
    expect(script.slice(call!.classStart, call!.classEnd)).toBe(
      'class {\n  label = "New";\n  count?: number;\n}',
    );
  });

  test("finds an object binding", () => {
    const call = findPropsCall(`const p = props(class { tone: "info" | "warn" = "info"; });`);
    expect(call?.binding).toEqual({ kind: "object", name: "p" });
    expect(call?.names).toEqual(["tone"]);
  });

  test("ignores the words inside a string", () => {
    expect(findPropsCall(`const s = "const { a } = props(class {";`)).toBeUndefined();
  });

  test("returns nothing for the old object form", () => {
    expect(findPropsCall("const { a } = props({ a: 1 });")).toBeUndefined();
  });
});
