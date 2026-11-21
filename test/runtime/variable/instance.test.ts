import { describe, expect, test } from "bun:test";
import { variable } from "#runtime/variable/variable.ts";

describe("count.onUpdate on one variable", () => {
  test("runs at start with before undefined", () => {
    const count = variable(3);
    const calls: unknown[][] = [];
    count.onUpdate((now, before) => calls.push([now, before]));
    expect(calls).toEqual([[3, undefined]]);
  });

  test("runs after each update with the new and the old value", () => {
    const count = variable(3);
    const calls: unknown[][] = [];
    count.onUpdate((now, before) => calls.push([now, before]), { onInit: false });

    count.value = 4;
    count.set(5);
    expect(calls).toEqual([
      [4, 3],
      [5, 4],
    ]);
  });

  test("onInit false skips the start run", () => {
    const count = variable(0);
    let runs = 0;
    count.onUpdate(() => runs++, { onInit: false });
    expect(runs).toBe(0);

    count.value = 1;
    expect(runs).toBe(1);
  });

  test("setting the same value does not run it", () => {
    const count = variable(1);
    let runs = 0;
    count.onUpdate(() => runs++, { onInit: false });

    count.value = 1;
    expect(runs).toBe(0);
  });

  test("stop function ends the runs", () => {
    const count = variable(0);
    let runs = 0;
    const stop = count.onUpdate(() => runs++, { onInit: false });

    stop();
    count.value = 1;
    expect(runs).toBe(0);
  });

  test("the same function can subscribe twice and runs for each", () => {
    const count = variable(0);
    let runs = 0;
    const handler = () => runs++;
    count.onUpdate(handler, { onInit: false });
    count.onUpdate(handler, { onInit: false });

    count.value = 1;
    expect(runs).toBe(2);
  });
});

describe("get and set", () => {
  test("get reads the value and set writes it, like .value", () => {
    const count = variable(1);
    expect(count.get()).toBe(1);
    count.set(2);
    expect(count.value).toBe(2);
    count.value = 3;
    expect(count.get()).toBe(3);
  });

  test("get tracks the variable, peek does not", () => {
    const count = variable(0);
    let tracked = 0;
    let untracked = 0;
    variable.autoRun(() => {
      tracked++;
      count.get();
    });
    variable.autoRun(() => {
      untracked++;
      count.peek();
    });

    count.set(1);
    expect(tracked).toBe(2);
    expect(untracked).toBe(1);
  });
});
