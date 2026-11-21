import { describe, expect, test } from "bun:test";
import { scopeCss } from "#compiler/style/modes.ts";
import { ID, TREE } from "./fixtures.ts";

describe("scope filter placement", () => {
  test("keeps the filter before pseudo-elements", () => {
    expect(scopeCss("p::before { content: 'x'; }", ID, "tree")).toContain(`p${TREE}::before {`);
  });

  test("keeps the filter before a legacy single-colon pseudo-element", () => {
    expect(scopeCss("p:before { content: 'x'; }", ID, "tree")).toContain(`p${TREE}:before {`);
  });
});
