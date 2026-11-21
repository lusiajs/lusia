import { afterEach, describe, expect, test } from "bun:test";
import type { Instance } from "lusiajs";
import { createTarget } from "../cells.ts";
import { resetVariable, rowValue } from "../variable.ts";
import { attachTables, detachTables, ROWS_PER_TABLE } from "./tables.ts";

// Small enough to check behaviour quickly. The stress page measures with PARENTS from tables.ts.
const TEST_PARENTS = 10;
const ROWS = TEST_PARENTS * ROWS_PER_TABLE;

let instances: Instance[] = [];
let targets: HTMLElement[] = [];

afterEach(() => {
  detachTables(instances);
  instances = [];
  for (const target of targets) target.remove();
  targets = [];
  resetVariable();
});

function newTarget(): HTMLElement {
  const target = createTarget("div");
  targets.push(target);
  return target;
}

describe("components", () => {
  test(`renders ${TEST_PARENTS} tables with ${ROWS_PER_TABLE} rows each`, () => {
    const target = newTarget();
    instances = attachTables(target, TEST_PARENTS);

    const tables = target.querySelectorAll(".table");
    expect(tables.length).toBe(TEST_PARENTS);
    expect(target.querySelectorAll(".row").length).toBe(ROWS);
    for (let id = 0; id < TEST_PARENTS; id++) {
      expect(tables[id]!.querySelector("h3")!.textContent).toBe(`Table ${id}`);
    }
    expect(tables[0]!.querySelector(".row span")!.textContent).toBe("row 0");
  });

  test("one variable write updates every row's prop", () => {
    const target = newTarget();
    instances = attachTables(target, TEST_PARENTS);

    rowValue.value = 42;
    const values = target.querySelectorAll(".row b");
    expect(values.length).toBe(ROWS);
    for (const value of values) expect(value.textContent).toBe("42");
  });

  test("detach leaves no nodes and later writes do not change detached nodes", () => {
    const target = newTarget();
    instances = attachTables(target, TEST_PARENTS);
    const row = target.querySelector(".row")!;
    detachTables(instances);
    instances = [];

    expect(target.childNodes.length).toBe(0);
    expect(row.isConnected).toBe(false);

    const before = row.outerHTML;
    rowValue.value = 99;
    expect(row.outerHTML).toBe(before);
  });

  test("each table keeps its own state when another table is detached", () => {
    const target = newTarget();
    instances = attachTables(target, 3);
    const tables = target.querySelectorAll(".table");
    const first = tables[0]!;
    const second = tables[1]!;
    const third = tables[2]!;

    instances.shift()!.detach();
    expect(first.isConnected).toBe(false);
    const detachedHtml = first.outerHTML;

    rowValue.value = 7;
    expect(second.querySelector("h3")!.textContent).toBe("Table 1");
    expect(third.querySelector("h3")!.textContent).toBe("Table 2");
    for (const value of [
      ...second.querySelectorAll(".row b"),
      ...third.querySelectorAll(".row b"),
    ]) {
      expect(value.textContent).toBe("7");
    }
    expect(first.outerHTML).toBe(detachedHtml);
  });
});
