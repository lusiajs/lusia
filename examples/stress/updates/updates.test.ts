import { afterEach, describe, expect, test } from "bun:test";
import { attach, type Instance } from "lusiajs";
import { attachCells, createTarget, detachCells } from "../cells.ts";
import Edge from "../expressions/Edge.lusia";
import { base, count, probe, resetVariable } from "../variable.ts";

const CELLS = 200;
const WRITES = 100;

let instances: Instance[] = [];
let targets: HTMLElement[] = [];

afterEach(() => {
  detachCells(instances);
  instances = [];
  for (const target of targets) target.remove();
  targets = [];
  resetVariable();
});

function newTarget(): HTMLElement {
  const target = createTarget("ul");
  targets.push(target);
  return target;
}

function writeCount(writes: number): void {
  for (let i = 1; i <= writes; i++) count.value = i;
}

describe("updates", () => {
  test(`one variable write updates all ${CELLS} cells`, () => {
    const target = newTarget();
    instances = attachCells(target, CELLS);

    count.value = 42;
    const items = target.querySelectorAll("li");
    expect(items.length).toBe(CELLS);
    for (const item of items) {
      expect(item.getAttribute("data-count")).toBe("42");
      expect(item.querySelector("b")!.textContent).toBe("42");
    }
  });

  test("each write updates each binding once", () => {
    const target = newTarget();
    instances = attachCells(target, 10);
    probe.reads = 0;
    probe.tones = 0;

    writeCount(WRITES);
    expect(probe.reads).toBe(10 * WRITES);
    expect(probe.tones).toBe(WRITES);
  });

  test("a diamond of derived variables evaluates once per write", () => {
    const target = newTarget();
    instances = [attach(Edge, target)];
    const before = probe.diamond;

    const writes = 5;
    for (let i = 2; i < 2 + writes; i++) base.value = i;
    expect(probe.diamond - before).toBe(writes);
    expect(target.querySelector("#diamond")!.textContent).toBe("19");
  });
});
