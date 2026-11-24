import { describe, expect, test } from "bun:test";
import { findApiById } from "../../../src/editor/api-lookup.ts";
import { memberItems, namespaceMemberItems } from "../../../src/editor/completion/members.ts";

const variableType = findApiById("variable-type")?.bullets ?? [];
const computedType = findApiById("computed-variable-type")?.bullets ?? [];

describe("memberItems", () => {
  test("lists the writable members of a variable", () => {
    const items = memberItems("variable");
    expect(items.map((item) => item.label)).toEqual(["value", "get", "set", "peek", "onUpdate"]);
    expect(items[0]).toMatchObject({ kind: "property", detail: variableType[0] ?? "" });
    expect(items.find((item) => item.label === "set")).toMatchObject({
      kind: "function",
      insertText: "set($0)",
      snippet: true,
    });
    expect(items.find((item) => item.label === "onUpdate")).toMatchObject({
      insertText: "onUpdate($0)",
      snippet: true,
      entryId: "variable-instance-on-update",
      detail: findApiById("variable-instance-on-update")?.signature,
    });
  });

  test("lists only the readable members of a computed variable", () => {
    const items = memberItems("computed");
    expect(items.map((item) => item.label)).toEqual(["value", "get", "peek"]);
    expect(items[0]?.detail).toBe(computedType[0] ?? "");
    expect(items[2]?.detail).toBe(computedType[1] ?? "");
  });

  test("lists set() but no onUpdate() on a prop", () => {
    const items = memberItems("prop");
    expect(items.map((item) => item.label)).toEqual(["value", "get", "set", "peek"]);
    expect(items[0]?.detail).toBe(variableType[0] ?? "");
  });
});

describe("namespaceMemberItems", () => {
  test("lists the functions under variable.", () => {
    const items = namespaceMemberItems("variable");
    expect(items.map((item) => item.label)).toEqual(["compute", "autoRun", "watch"]);
    expect(items[0]).toMatchObject({
      kind: "function",
      insertText: "compute",
      detail: findApiById("variable-compute")?.signature,
      entryId: "variable-compute",
    });
    expect(items[2]?.entryId).toBe("variable-watch");
  });

  test("returns nothing for another root", () => {
    expect(namespaceMemberItems("EASE")).toEqual([]);
    expect(namespaceMemberItems("props")).toEqual([]);
  });
});
