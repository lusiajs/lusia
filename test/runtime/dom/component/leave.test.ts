import { describe, expect, test } from "bun:test";
import { leaveThen } from "#runtime/dom/component/leave.ts";

describe("leaveThen", () => {
  test("without leaves the nodes are removed synchronously", () => {
    let removed = false;
    leaveThen([], () => (removed = true));
    expect(removed).toBe(true);
  });

  test("with leaves the removal waits for all of them", async () => {
    let removed = false;
    leaveThen([() => Promise.resolve(), () => new Promise<void>(() => {})], () => (removed = true));
    await Promise.resolve();
    expect(removed).toBe(false);
  });
});
