import { afterEach, describe, expect, test } from "bun:test";
import { attach, type Instance } from "lusiajs";
import { createTarget } from "../cells.ts";
import List from "./List.lusia";
import { makeRows, rows, shuffled } from "./rows.ts";

// Small enough to check behaviour quickly. The stress page measures with ROWS from main.ts.
const TEST_ROWS = 300;

let instance: Instance | null = null;
let target: HTMLElement | null = null;

afterEach(async () => {
  await instance?.detach();
  target?.remove();
  instance = null;
  target = null;
  rows.value = [];
});

function mount(): HTMLElement {
  target = createTarget("div");
  instance = attach(List, target);
  return target;
}

function itemOf(root: HTMLElement, id: number): HTMLElement {
  return root.querySelector<HTMLElement>(`[data-id="${id}"]`)!;
}

describe("EACH with many rows", () => {
  test(`creates ${TEST_ROWS} rows in order`, () => {
    const root = mount();
    rows.value = makeRows(TEST_ROWS);
    const items = root.querySelectorAll("li");
    expect(items.length).toBe(TEST_ROWS);
    expect(items[0]!.textContent).toBe("0. Row 0");
    expect(items[TEST_ROWS - 1]!.textContent).toBe(`${TEST_ROWS - 1}. Row ${TEST_ROWS - 1}`);
  });

  test("reversing moves the existing rows and updates their index", () => {
    const root = mount();
    rows.value = makeRows(TEST_ROWS);
    const before = itemOf(root, 4);

    rows.value = [...rows.value].reverse();
    expect(itemOf(root, 4)).toBe(before);
    expect(root.querySelector("li")!.textContent).toBe(`0. Row ${TEST_ROWS - 1}`);
    expect(before.textContent).toBe(`${TEST_ROWS - 5}. Row 4`);
  });

  test("shuffling keeps every row element", () => {
    const root = mount();
    rows.value = makeRows(TEST_ROWS);
    const before = new Map(
      [...root.querySelectorAll<HTMLLIElement>("li")].map((item) => [item.dataset.id, item]),
    );

    rows.value = shuffled(rows.value);
    const after = root.querySelectorAll("li");
    expect(after.length).toBe(TEST_ROWS);
    for (const item of after) expect(item).toBe(before.get(item.dataset.id)!);
  });

  test("keyed reuse keeps rows whose objects stay and adds the new ones", () => {
    const root = mount();
    rows.value = makeRows(TEST_ROWS);
    const kept = rows.value.filter((row) => row.id % 2 === 0);
    const elementById = new Map(
      [...root.querySelectorAll<HTMLElement>("li")].map((item) => [item.dataset.id, item]),
    );

    rows.value = [...kept, ...makeRows(TEST_ROWS / 2, TEST_ROWS)];
    const afterById = new Map(
      [...root.querySelectorAll<HTMLElement>("li")].map((item) => [item.dataset.id, item]),
    );
    expect(afterById.size).toBe(TEST_ROWS);
    for (const row of kept)
      expect(afterById.get(String(row.id))).toBe(elementById.get(String(row.id))!);
    expect(itemOf(root, TEST_ROWS).textContent).toBe(`${kept.length}. Row ${TEST_ROWS}`);
  });

  test("removing every row leaves no list items", () => {
    const root = mount();
    rows.value = makeRows(TEST_ROWS);
    rows.value = [];
    expect(root.querySelectorAll("li").length).toBe(0);
  });
});
