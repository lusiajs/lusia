import { afterEach, describe, expect, test } from "bun:test";
import Tree from "../fixtures/Tree.lusia";
import { click, host, mount, resetMounts } from "../fixtures/mount.ts";

afterEach(resetMounts);

const data = {
  name: "root",
  children: [
    { name: "a", children: [{ name: "a1", children: [] }] },
    { name: "b", children: [] },
  ],
};

describe("a component that imports itself", () => {
  test("renders every level of its data", () => {
    const el = host();
    mount(Tree, el, { node: () => data });
    expect(el.querySelectorAll(".tree-node").length).toBe(4);
  });

  test("a child's IF hides its own children, and only its own", () => {
    const el = host();
    mount(Tree, el, { node: () => data });
    click(el, ".toggle");
    expect(el.querySelectorAll(".tree-node").length).toBe(1);
  });
});
