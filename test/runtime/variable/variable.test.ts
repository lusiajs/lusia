import { describe, expect, test } from "bun:test";
import { variable } from "#runtime/variable/variable.ts";
import { watch } from "#runtime/variable/graph.ts";

describe("variable", () => {
  test("reads and writes a value", () => {
    const count = variable(1);
    expect(count.value).toBe(1);
    count.value = 2;
    expect(count.value).toBe(2);
    expect(count.peek()).toBe(2);
  });

  test("setting the same value (Object.is) does not notify", () => {
    const value = variable(NaN);
    let runs = 0;
    watch(() => {
      runs++;
      value.value;
    });
    value.value = NaN;
    expect(runs).toBe(1);
  });

  test("setting +0 to -0 is a change (Object.is)", () => {
    const value = variable(0);
    let runs = 0;
    watch(() => {
      runs++;
      value.value;
    });
    value.value = -0;
    expect(runs).toBe(2);
  });
});

describe("peek", () => {
  test("a variable's peek does not subscribe the watcher", () => {
    const value = variable(0);
    let runs = 0;
    watch(() => {
      runs++;
      value.peek();
    });
    value.value = 1;
    expect(runs).toBe(1);
  });

  test("a read variable's peek does not subscribe the watcher, and still gives fresh values", () => {
    const base = variable(1);
    const doubled = variable.compute(() => base.value * 2);
    const seen: number[] = [];
    let runs = 0;
    watch(() => {
      runs++;
      seen.push(doubled.peek());
    });
    base.value = 2;
    expect(runs).toBe(1);
    expect(doubled.peek()).toBe(4);
    expect(seen).toEqual([2]);
  });
});

describe("variable.compute", () => {
  test("caches its value until an input changes", () => {
    const base = variable(2);
    let calls = 0;
    const double = variable.compute(() => {
      calls++;
      return base.value * 2;
    });
    expect(double.value).toBe(4);
    expect(double.value).toBe(4);
    expect(double.peek()).toBe(4);
    expect(calls).toBe(1);

    base.value = 3;
    expect(double.value).toBe(6);
    expect(double.value).toBe(6);
    expect(calls).toBe(2);
  });

  test("is lazy: does not run until read", () => {
    const base = variable(1);
    let calls = 0;
    const plusOne = variable.compute(() => {
      calls++;
      return base.value + 1;
    });
    expect(calls).toBe(0);
    expect(plusOne.value).toBe(2);
    expect(calls).toBe(1);
  });

  test("diamond: watch on d runs once per write to a", () => {
    const a = variable(1);
    const b = variable.compute(() => a.value * 2);
    const c = variable.compute(() => a.value + 1);
    const d = variable.compute(() => b.value + c.value);
    const seen: number[] = [];
    watch(() => {
      seen.push(d.value);
    });
    expect(seen).toEqual([4]);

    a.value = 2;
    expect(seen).toEqual([4, 7]);

    a.value = 3;
    expect(seen).toEqual([4, 7, 10]);
  });

  test("re-tracks dynamic dependencies on each run", () => {
    const useA = variable(true);
    const a = variable("a");
    const b = variable("b");
    let calls = 0;
    const picked = variable.compute(() => {
      calls++;
      return useA.value ? a.value : b.value;
    });
    const seen: string[] = [];
    watch(() => {
      seen.push(picked.value);
    });
    expect(seen).toEqual(["a"]);

    // b is not a dependency while the branch reads a.
    b.value = "B";
    expect(seen).toEqual(["a"]);
    expect(calls).toBe(1);

    useA.value = false;
    expect(seen).toEqual(["a", "B"]);

    // a is no longer a dependency after the branch switch.
    a.value = "A2";
    expect(seen).toEqual(["a", "B"]);
    expect(calls).toBe(2);
  });
});
