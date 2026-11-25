import { describe, expect, test } from "bun:test";
import { rewriteProps } from "#compiler/props/rewrite.ts";
import { findShadow } from "#compiler/props/shadow.ts";

const rule = { names: new Set(["label", "tone", "id"]), target: "__props" };

describe("rewriteProps", () => {
  test("rewrites reads and writes", () => {
    expect(rewriteProps("label = tone + label", rule)).toBe("__props.label = __props.tone + __props.label");
  });

  test("expands a shorthand object property", () => {
    expect(rewriteProps("const o = { label, count: 1 }", rule)).toBe(
      "const o = { label: __props.label, count: 1 }",
    );
  });

  test("keeps object keys and property access", () => {
    expect(rewriteProps("o.label + o?.tone + { label: 2 }.label", rule)).toBe(
      "o.label + o?.tone + { label: 2 }.label",
    );
  });

  test("rewrites a spread", () => {
    expect(rewriteProps("[...label]", rule)).toBe("[...__props.label]");
  });

  test("keeps strings and comments", () => {
    expect(rewriteProps(`"label" + 'tone' // label\n/* tone */ label`, rule)).toBe(
      `"label" + 'tone' // label\n/* tone */ __props.label`,
    );
  });

  test("rewrites inside template holes but not template text", () => {
    expect(rewriteProps("`label ${label}!`", rule)).toBe("`label ${__props.label}!`");
  });

  test("keeps names that only contain a prop name", () => {
    expect(rewriteProps("labelled + my_label + label2", rule)).toBe("labelled + my_label + label2");
  });

  test("does nothing without names", () => {
    expect(rewriteProps("label", { names: new Set(), target: "__props" })).toBe("label");
  });
});

describe("findShadow", () => {
  const names = new Set(["label"]);

  test("finds a declaration, a parameter, a catch and a destructured name", () => {
    expect(findShadow("const label = 1;", names)?.name).toBe("label");
    expect(findShadow("let x = (label) => label;", names)?.name).toBe("label");
    expect(findShadow("function f(a, label = 2) {}", names)?.name).toBe("label");
    expect(findShadow("try {} catch (label) {}", names)?.name).toBe("label");
    expect(findShadow("const { a: label } = o;", names)?.name).toBe("label");
  });

  test("ignores other names and reads", () => {
    expect(findShadow("const other = label;", names)).toBeUndefined();
  });
});

describe("rewriteProps regex literals", () => {
  test("keeps a regex body and its flags", () => {
    expect(rewriteProps("const re = /tone/g;", rule)).toBe("const re = /tone/g;");
  });

  test("keeps a regex after a keyword", () => {
    expect(rewriteProps("return /label/.test(s)", rule)).toBe("return /label/.test(s)");
  });

  test("rewrites a division", () => {
    expect(rewriteProps("a / tone", rule)).toBe("a / __props.tone");
    expect(rewriteProps("(a) / tone", rule)).toBe("(a) / __props.tone");
  });

  test("keeps a slash inside a character class", () => {
    expect(rewriteProps("const re = /[/]tone/;", rule)).toBe("const re = /[/]tone/;");
  });

  test("keeps an escaped slash", () => {
    expect(rewriteProps("const re = /a\\/tone/;", rule)).toBe("const re = /a\\/tone/;");
  });
});

describe("rewriteProps type members and keys", () => {
  test("keeps an interface member", () => {
    expect(rewriteProps("interface DomData {\n  id: string;\n}\nid", rule)).toBe(
      "interface DomData {\n  id: string;\n}\n__props.id",
    );
  });

  test("keeps a type alias member", () => {
    expect(rewriteProps("type Node = { id: string };\nid", rule)).toBe(
      "type Node = { id: string };\n__props.id",
    );
  });

  test("keeps an optional key", () => {
    expect(rewriteProps("const o = { id?: 1 };", rule)).toBe("const o = { id?: 1 };");
  });

  test("rewrites a ternary value", () => {
    expect(rewriteProps("a ? id : b", rule)).toBe("a ? __props.id : b");
  });

  test("rewrites a case value", () => {
    expect(rewriteProps("switch (x) { case id: break; }", rule)).toBe(
      "switch (x) { case __props.id: break; }",
    );
  });
});
