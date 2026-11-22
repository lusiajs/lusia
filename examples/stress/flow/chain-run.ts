import { attach } from "lusiajs";
import { createTarget } from "../cells.ts";
import { formatMs, timed, type Result } from "../report.ts";
import { expectedLeaves, first, second, setChain, third } from "./chain.ts";
import Chain from "./Chain.lusia";

export const CHAIN_SWITCHES = 1000;
export const CHAIN_BATCH = 100;

function shownLeaves(root: HTMLElement): string[] {
  return [...root.querySelectorAll(".leaf")].map((leaf) => (leaf.textContent ?? "").trim());
}

function sameItems(actual: string[], expected: string[]): boolean {
  return actual.length === expected.length && actual.every((item, i) => item === expected[i]);
}

// The leaves must match the flags, and the chain must hold no element besides its leaves.
export function chainMatches(root: HTMLElement): boolean {
  const expected = expectedLeaves(first.value, second.value, third.value);
  const elementCount = root.querySelectorAll("*").length;
  return sameItems(shownLeaves(root), expected) && elementCount === 1 + expected.length;
}

export function runChain(): Result[] {
  const target = createTarget("div");
  const instance = attach(Chain, target);
  let badBatches = 0;
  const switchMs = timed(() => {
    for (let start = 0; start < CHAIN_SWITCHES; start += CHAIN_BATCH) {
      for (let step = start; step < start + CHAIN_BATCH; step++) setChain(step);
      if (!chainMatches(target)) badBatches++;
    }
  });
  instance.detach();
  const left = target.querySelectorAll("*").length;
  target.remove();
  setChain(0);
  return [
    {
      name: `IF chain: ${CHAIN_SWITCHES} flag switches, DOM checked every ${CHAIN_BATCH}`,
      value: formatMs(switchMs),
    },
    {
      name: `IF chain: batches with a wrong DOM (expect 0 of ${CHAIN_SWITCHES / CHAIN_BATCH})`,
      value: String(badBatches),
    },
    { name: "IF chain: elements left after detach (expect 0)", value: String(left) },
  ];
}
