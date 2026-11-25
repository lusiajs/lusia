import { describe, expect, test } from "bun:test";
import { findRoute } from "#runtime/router/find.ts";
import { matchPattern } from "#runtime/router/pattern.ts";

describe("matchPattern", () => {
  const cases: [string, string, Record<string, string> | undefined][] = [
    ["/", "/", {}],
    ["/guide", "/guide", {}],
    ["/guide", "/guide/", {}],
    ["/guide/", "/guide", {}],
    ["/guide", "/guides", undefined],
    ["/guide", "/guide/more", undefined],
    ["/", "/guide", undefined],
    ["/user/:id", "/user/42", { id: "42" }],
    ["/user/:id", "/user/", undefined],
    ["/user/:id", "/user", undefined],
    ["/user/:id", "/user/42/edit", undefined],
    ["/:a/:b", "/x/y", { a: "x", b: "y" }],
    ["/file/:name", "/file/a%20b", { name: "a b" }],
    ["/file/:name", "/file/%E0%A4%A", { name: "%E0%A4%A" }],
    ["*", "/anything/at/all", {}],
  ];

  for (const [pattern, path, expected] of cases) {
    test(`${pattern} against ${path}`, () => {
      expect(matchPattern(pattern, path)).toEqual(expected);
    });
  }
});

describe("findRoute", () => {
  const keys = ["*", "/user/:id", "/user/new", "/:page", "/"];

  test("an exact key wins over a :name key, whatever the order", () => {
    expect(findRoute(keys, "/user/new")?.key).toBe("/user/new");
  });

  test("a :name key matches before the * key", () => {
    expect(findRoute(keys, "/user/7")).toEqual({ key: "/user/:id", params: { id: "7" } });
    expect(findRoute(keys, "/about")).toEqual({ key: "/:page", params: { page: "about" } });
  });

  test("the root key matches only the root", () => {
    expect(findRoute(keys, "/")?.key).toBe("/");
  });

  test("* is the fallback for anything else", () => {
    expect(findRoute(keys, "/x/y")).toEqual({ key: "*", params: {} });
  });

  test(":name keys match in object order", () => {
    expect(findRoute(["/:a", "/:b"], "/x")?.key).toBe("/:a");
  });

  test("no match and no * gives undefined", () => {
    expect(findRoute(["/", "/guide"], "/nope")).toBeUndefined();
  });
});
