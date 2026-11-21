import { describe, expect, test } from "bun:test";
import { scopeCss } from "#compiler/style/modes.ts";
import { ID, SCOPED, TREE } from "./fixtures.ts";

describe("scopeCss tree mode", () => {
  test("adds the tree filter to the subject", () => {
    expect(scopeCss(".t { color: red; }", ID, "tree")).toBe(`.t${TREE} { color: red; }\n`);
  });

  test("scopes rules inside @media", () => {
    const out = scopeCss("@media (max-width: 600px) { h1 { color: red; } }", ID, "tree");
    expect(out).toContain("@media (max-width: 600px) {");
    expect(out).toContain(`h1${TREE} {`);
  });

  test("leaves @keyframes untouched", () => {
    const css =
      "@keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }";
    const out = scopeCss(css, ID, "tree");
    expect(out).toContain("@keyframes spin {");
    expect(out).toContain("from { transform: rotate(0); }");
    expect(out).not.toContain(TREE);
    expect(out).not.toContain(SCOPED);
  });
});

describe("scopeCss scoped mode", () => {
  test("uses the scoped filter that stops at child components", () => {
    expect(scopeCss(".t { color: red; }", ID, "scoped")).toBe(`.t${SCOPED} { color: red; }\n`);
  });

  test("@scoped block inside tree mode switches to scoped", () => {
    const out = scopeCss("h1 { color: red; } @scoped { h1 { color: blue; } }", ID, "tree");
    expect(out).toContain(`h1${TREE} { color: red; }`);
    expect(out).toContain(`h1${SCOPED} { color: blue; }`);
  });

  test("@scoped block inside @media is scoped", () => {
    const out = scopeCss("@media print { @scoped { h1 { color: red; } } }", ID, "tree");
    expect(out).toContain("@media print {");
    expect(out).toContain(`h1${SCOPED} {`);
  });
});

describe("scopeCss global mode", () => {
  test("leaves selectors unscoped", () => {
    expect(scopeCss("body { margin: 0; }", ID, "global")).toBe("body { margin: 0; }\n");
  });

  test("@global block inside tree mode is unscoped", () => {
    const out = scopeCss("h1 { color: red; } @global { body { margin: 0; } }", ID, "tree");
    expect(out).toContain(`h1${TREE} { color: red; }`);
    expect(out).toContain("body { margin: 0; }");
    expect(out).not.toContain("body:where");
  });

  test("@global block inside @media is unscoped", () => {
    const out = scopeCss("@media print { @global { body { margin: 0; } } }", ID, "tree");
    expect(out).toContain("@media print {");
    expect(out).toContain("body { margin: 0; }");
  });
});
