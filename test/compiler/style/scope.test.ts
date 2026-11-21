import { describe, expect, test } from "bun:test";
import { scopeCss } from "#compiler/style/modes.ts";
import { ID, TREE } from "./fixtures.ts";

describe("scopeCss selector lists and ancestors", () => {
  test("scopes each selector in a list", () => {
    const out = scopeCss("h1, .a, p .b { color: red; }", ID, "tree");
    expect(out).toContain(`h1${TREE}, .a${TREE}, p .b${TREE} {`);
  });

  test("does not split commas inside :is()", () => {
    const out = scopeCss(".x:is(.a, .b) { color: red; }", ID, "tree");
    expect(out).toContain(`.x:is(.a, .b)${TREE} {`);
  });

  test("keeps an ancestor unscoped and scopes only the subject", () => {
    expect(scopeCss(".dark h1 { color: red; }", ID, "tree")).toContain(`.dark h1${TREE} {`);
  });
});

describe("inline :global()", () => {
  test(":global(body) is unscoped", () => {
    expect(scopeCss(":global(body) { margin: 0; }", ID, "tree")).toBe("body { margin: 0; }\n");
  });

  test(".card :global(a) scopes .card and leaves a global", () => {
    expect(scopeCss(".card :global(a) { color: red; }", ID, "tree")).toContain(`.card${TREE} a {`);
  });

  test(":global(.dark) .title keeps the subject scoped", () => {
    expect(scopeCss(":global(.dark) .title { color: red; }", ID, "tree")).toContain(
      `.dark .title${TREE} {`,
    );
  });

  test("nested parens inside :global() are unwrapped", () => {
    expect(scopeCss(":global(a:is(.x, .y)) { color: red; }", ID, "tree")).toContain(
      "a:is(.x, .y) {",
    );
  });

  test("nested parens inside :global() keep the scoped part", () => {
    expect(scopeCss(":global(a:is(.x, .y)) .t { color: red; }", ID, "tree")).toContain(
      `a:is(.x, .y) .t${TREE} {`,
    );
  });
});
