import { describe, expect, test } from "bun:test";
import { batch, untrack, watch } from "#runtime/variable/graph.ts";
import { variable } from "#runtime/variable/variable.ts";

describe("batch", () => {
  test("runs watchers once for several writes", () => {
    const first = variable(0);
    const second = variable(0);
    let runs = 0;
    watch(() => {
      runs++;
      first.value;
      second.value;
    });
    expect(runs).toBe(1);

    batch(() => {
      first.value = 1;
      second.value = 2;
      first.value = 3;
    });
    expect(runs).toBe(2);
  });
});

describe("untrack", () => {
  test("reads do not subscribe", () => {
    const source = variable(0);
    let runs = 0;
    watch(() => {
      runs++;
      untrack(() => source.value);
    });
    source.value = 5;
    expect(runs).toBe(1);
  });
});

describe("watch", () => {
  test("stop function unsubscribes", () => {
    const source = variable(0);
    let runs = 0;
    const stop = watch(() => {
      runs++;
      source.value;
    });
    source.value = 1;
    expect(runs).toBe(2);

    stop();
    source.value = 2;
    expect(runs).toBe(2);
  });
});
