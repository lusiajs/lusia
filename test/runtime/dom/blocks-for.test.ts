import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { rangeOf } from "#runtime/dom/blocks/range.ts";
import Ranges from "./fixtures/Ranges.lusia";
import { resetVariable, state } from "./fixtures/state.ts";
import { host, mount, resetMounts } from "./fixtures/mount.ts";

beforeEach(resetVariable);
afterEach(resetMounts);

function numbers(root: ParentNode): string[] {
  return [...root.querySelectorAll(".n")].map((el) => el.textContent ?? "");
}

describe("rangeOf", () => {
  test("counts up and excludes the end", () => {
    expect(rangeOf({ from: 0, to: 3, step: 1 })).toEqual([0, 1, 2]);
  });

  test("a negative step counts down and excludes the end", () => {
    expect(rangeOf({ from: 3, to: 0, step: -1 })).toEqual([3, 2, 1]);
  });

  test("an empty range gives no values", () => {
    expect(rangeOf({ from: 2, to: 2, step: 1 })).toEqual([]);
  });

  test("a step of 0 is an error", () => {
    expect(() => rangeOf({ from: 0, to: 3, step: 0 })).toThrow("FOR needs a step that is not 0");
  });
});

describe("FOR in a component", () => {
  test("renders the range", () => {
    const el = host();
    mount(Ranges, el);
    expect(numbers(el)).toEqual(["0", "1", "2"]);
  });

  test("bounds are read reactively and keep the rows whose value stays", () => {
    const el = host();
    mount(Ranges, el);
    const [zero] = el.querySelectorAll(".n");

    state.to.value = 5;
    expect(numbers(el)).toEqual(["0", "1", "2", "3", "4"]);
    expect(el.querySelectorAll(".n")[0]).toBe(zero!);

    state.from.value = 2;
    state.to.value = 4;
    expect(numbers(el)).toEqual(["2", "3"]);
  });

  test("a negative step counts down", () => {
    const el = host();
    state.from.value = 3;
    state.to.value = 0;
    state.step.value = -1;
    mount(Ranges, el);
    expect(numbers(el)).toEqual(["3", "2", "1"]);
  });
});
