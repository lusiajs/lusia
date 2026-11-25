import { beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { PARAMS, PATH } from "#runtime/index.ts";
import { routeKeys } from "#runtime/router/params.ts";
import { resetAddress, setTestUrl } from "./fake-page.ts";

beforeAll(async () => {
  await setTestUrl();
});

beforeEach(async () => {
  routeKeys.set([]);
  await resetAddress("/");
});

describe("PATH", () => {
  test("holds the pathname of the address bar", async () => {
    await resetAddress("/guide?x=1");
    expect(PATH.value).toBe("/guide");
  });

  test("setting it pushes the full URL and keeps only the path in PATH", () => {
    PATH.value = "/guide?x=1#top";
    expect(location.href).toBe("http://localhost/guide?x=1#top");
    expect(PATH.value).toBe("/guide");
  });

  test("match uses the pattern rules", () => {
    PATH.value = "/guide/42";
    expect(PATH.match("/guide/:id")).toBe(true);
    expect(PATH.match("/guide")).toBe(false);
    expect(PATH.match("*")).toBe(true);
  });

  test("onUpdate runs when the path changes", () => {
    const seen: string[] = [];
    PATH.onUpdate((now) => seen.push(now), { onInit: false });
    PATH.value = "/updated";
    expect(seen).toEqual(["/updated"]);
  });
});

describe("PARAMS", () => {
  test("holds the query values", async () => {
    await resetAddress("/search?q=cat&page=2");
    expect(PARAMS.value).toEqual({ q: "cat", page: "2" });
  });

  test("holds the :name values of the current page, next to the query", () => {
    routeKeys.set(["/", "/user/:id"]);
    PATH.value = "/user/42?tab=posts";
    expect(PARAMS.value).toEqual({ id: "42", tab: "posts" });
  });

  test("a :name value wins over a query value with the same name", () => {
    routeKeys.set(["/user/:id"]);
    PATH.value = "/user/42?id=7";
    expect(PARAMS.value.id).toBe("42");
  });

  test("updates when only the query changes", () => {
    PATH.value = "/list?n=1";
    expect(PARAMS.value.n).toBe("1");
    PATH.value = "/list?n=2";
    expect(PARAMS.value.n).toBe("2");
  });

  test("setting it throws a runtime error", () => {
    const writable = PARAMS as unknown as { value: unknown };
    expect(() => {
      writable.value = {};
    }).toThrow("PARAMS.value cannot be set");
  });
});
