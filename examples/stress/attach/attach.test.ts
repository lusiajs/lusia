import { afterEach, describe, expect, test } from "bun:test";
import { attach, type Instance } from "lusiajs";
import { attachCells, createTarget, detachCells } from "../cells.ts";
import { count, resetVariable } from "../variable.ts";
import Cell from "./Cell.lusia";

const CYCLES = 50;
const CELLS = 200;

let instances: Instance[] = [];
let targets: HTMLElement[] = [];

afterEach(() => {
  detachCells(instances);
  instances = [];
  for (const target of targets) target.remove();
  targets = [];
  resetVariable();
});

// Dev builds add empty text markers around each instance, so leaks are counted without them.
function contentNodes(target: HTMLElement): ChildNode[] {
  return [...target.childNodes].filter((node) => node.textContent !== "");
}

function newTarget(): HTMLElement {
  const target = createTarget("ul");
  targets.push(target);
  return target;
}

describe("attach and detach", () => {
  test(`attaches and detaches a cell ${CYCLES} times without leaving nodes`, () => {
    for (let i = 0; i < CYCLES; i++) {
      const target = newTarget();
      const instance = attach(Cell, target);
      const item = target.querySelector("li")!;
      expect(contentNodes(target).length).toBe(1);

      instance.detach();
      expect(contentNodes(target).length).toBe(0);
      expect(item.isConnected).toBe(false);
    }
  });

  test("updates after detach do not change the detached nodes", () => {
    const target = newTarget();
    const instance = attach(Cell, target);
    const item = target.querySelector("li")!;
    instance.detach();

    const before = item.outerHTML;
    count.value = 99;
    expect(item.outerHTML).toBe(before);
  });

  test(`attaches ${CELLS} cells and detaches them all`, () => {
    const target = newTarget();
    instances = attachCells(target, CELLS);
    expect(target.querySelectorAll("li").length).toBe(CELLS);

    detachCells(instances);
    instances = [];
    expect(contentNodes(target).length).toBe(0);
  });
});
