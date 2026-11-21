import { describe, expect, test } from "bun:test";
import { variable } from "#runtime/variable/variable.ts";

describe("variable.compute", () => {
  test("get reads the computed value", () => {
    const base = variable(2);
    const doubled = variable.compute(() => base.value * 2);
    expect(doubled.get()).toBe(4);
    base.value = 3;
    expect(doubled.get()).toBe(6);
  });

  test("set throws a LusiaError with the hint", () => {
    const doubled = variable.compute(() => 4) as unknown as { set(value: number): void };
    expect(() => doubled.set(1)).toThrow("a computed variable cannot be set");
  });
});
