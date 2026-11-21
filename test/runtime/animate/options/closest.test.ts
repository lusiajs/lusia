import { describe, expect, test } from "bun:test";
import { closestName } from "#runtime/animate/options/closest.ts";

describe("closestName", () => {
  test("finds a name with one letter wrong", () => {
    expect(closestName("defaut", ["default"])).toBe("default");
    expect(closestName("durtion", ["style", "duration"])).toBe("duration");
  });

  test("finds a name with two letters swapped", () => {
    expect(closestName("wehn", ["when", "more"])).toBe("when");
  });

  test("gives nothing when no name is near", () => {
    expect(closestName("xyz", ["default"])).toBeUndefined();
  });

  test("prefers the nearest of several names", () => {
    expect(closestName("mroe", ["more", "midway"])).toBe("more");
  });
});
