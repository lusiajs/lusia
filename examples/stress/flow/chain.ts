import { variable } from "lusiajs";

// The IF chain in Chain.lusia reads these three flags.
export const first = variable(false);
export const second = variable(false);
export const third = variable(false);

export const CHAIN_STATES = 8;

// The bits of step set the flags, so each run of 8 steps covers every combination.
export function setChain(step: number): void {
  first.value = (step & 1) !== 0;
  second.value = (step & 2) !== 0;
  third.value = (step & 4) !== 0;
}

function insideFirst(second: boolean, third: boolean): string[] {
  if (second) return ["A-B"];
  if (third) return ["A-C"];
  return ["A-none"];
}

function insideSecond(third: boolean): string[] {
  if (third) return ["B-C"];
  return ["B-else"];
}

// The leaves Chain.lusia shows for these flags, in document order.
export function expectedLeaves(first: boolean, second: boolean, third: boolean): string[] {
  if (first) return ["A", ...insideFirst(second, third)];
  if (second) return ["B", ...insideSecond(third)];
  if (third) return ["C"];
  return ["none"];
}
