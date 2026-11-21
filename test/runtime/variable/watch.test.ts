import { describe, expect, test } from "bun:test";
import { variable } from "#runtime/variable/variable.ts";

describe("variable.watch", () => {
  test("runs once at start by default", () => {
    const a = variable(1);
    let runs = 0;
    variable.watch([a], () => runs++);
    expect(runs).toBe(1);
  });

  test("onInit false skips the first run", () => {
    const a = variable(1);
    let runs = 0;
    variable.watch([a], () => runs++, { onInit: false });
    expect(runs).toBe(0);

    a.value = 2;
    expect(runs).toBe(1);
  });

  test("runs only when a listed variable updates", () => {
    const a = variable(0);
    const b = variable(0);
    const unlisted = variable(0);
    let runs = 0;
    variable.watch([a, b], () => runs++, { onInit: false });

    unlisted.value = 1;
    expect(runs).toBe(0);

    a.value = 1;
    expect(runs).toBe(1);

    b.value = 1;
    expect(runs).toBe(2);
  });

  test("reads inside its function are not tracked", () => {
    const a = variable(0);
    const other = variable(0);
    let runs = 0;
    variable.watch(
      [a],
      () => {
        runs++;
        other.value;
      },
      { onInit: false },
    );

    other.value = 1;
    expect(runs).toBe(0);
  });

  test("works with computed variables in the list", () => {
    const base = variable(1);
    const doubled = variable.compute(() => base.value * 2);
    let runs = 0;
    variable.watch([doubled], () => runs++, { onInit: false });

    base.value = 2;
    expect(runs).toBe(1);
  });

  test("stop function ends the runs", () => {
    const a = variable(0);
    let runs = 0;
    const stop = variable.watch([a], () => runs++, { onInit: false });

    stop();
    a.value = 1;
    expect(runs).toBe(0);
  });
});
