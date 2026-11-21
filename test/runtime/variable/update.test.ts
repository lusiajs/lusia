import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { watch } from "#runtime/variable/graph.ts";
import { variable } from "#runtime/variable/variable.ts";
import Watch from "../dom/fixtures/Watch.lusia";
import { events } from "../dom/fixtures/log.ts";
import { resetVariable, state } from "../dom/fixtures/state.ts";
import { mount, resetMounts, unmount } from "../dom/fixtures/mount.ts";

beforeEach(resetVariable);
afterEach(resetMounts);

describe("variable.autoRun", () => {
  test("runs once right away", () => {
    const count = variable(0);
    let runs = 0;
    variable.autoRun(function countRuns() {
      runs++;
      count.value;
    });
    expect(runs).toBe(1);
  });

  test("runs again only when a variable it read changes", () => {
    const read = variable(0);
    const unrelated = variable(0);
    let runs = 0;
    variable.autoRun(function readOne() {
      runs++;
      read.value;
    });

    unrelated.value = 1;
    expect(runs).toBe(1);

    read.value = 1;
    expect(runs).toBe(2);
  });

  test("reruns when a read variable it read changes", () => {
    const base = variable(1);
    const doubled = variable.compute(() => base.value * 2);
    const seen: number[] = [];
    variable.autoRun(function recordDoubled() {
      seen.push(doubled.value);
    });

    base.value = 2;
    expect(seen).toEqual([2, 4]);
  });

  test("re-tracks reads on each run, so a branch not taken is not read", () => {
    const useA = variable(true);
    const a = variable("a");
    const b = variable("b");
    let runs = 0;
    variable.autoRun(function pickOne() {
      runs++;
      return useA.value ? a.value : b.value;
    });

    b.value = "B";
    expect(runs).toBe(1);

    useA.value = false;
    expect(runs).toBe(2);

    a.value = "A2";
    expect(runs).toBe(2);
  });

  test("stop function ends the updates", () => {
    const count = variable(0);
    let runs = 0;
    const stop = variable.autoRun(function countRuns() {
      runs++;
      count.value;
    });

    stop();
    count.value = 1;
    expect(runs).toBe(1);
  });

  test("writes made by its function reach a dependent watcher once", () => {
    const trigger = variable(0);
    const first = variable(0);
    const second = variable(0);
    const third = variable(0);
    variable.autoRun(function writeThree() {
      const next = trigger.value;
      first.value = next;
      second.value = next;
      third.value = next;
    });
    let runs = 0;
    const stop = watch(() => {
      runs++;
      first.value;
      second.value;
      third.value;
    });
    expect(runs).toBe(1);

    trigger.value = 1;
    expect(runs).toBe(2);
    stop();
  });

  test("stops when its component is removed", () => {
    events.length = 0;
    const el = document.createElement("div");
    document.body.append(el);
    const instance = mount(Watch, el);
    expect(events).toEqual(["count 0"]);

    state.count.value = 1;
    expect(events).toEqual(["count 0", "count 1"]);

    unmount(instance);
    state.count.value = 2;
    expect(events).toEqual(["count 0", "count 1"]);
  });
});
