import { variable, type Variable } from "lusiajs";

// Counts how often things run, so tests can check the update count.
export const probe = { reads: 0, tones: 0, diamond: 0 };

export const count = variable(0);
export const label = variable("cell");

export const tone = variable.compute(() => {
  probe.tones++;
  return count.value % 2 ? "odd" : "even";
});

// Used in a text binding: each run of that binding is one DOM update.
export function tick(value: Variable<number>): number {
  probe.reads++;
  return value.value;
}

// Shared by every table row in the components scenario.
export const rowValue = variable(0);

export const base = variable(1);
const left = variable.compute(() => base.value + 1);
const right = variable.compute(() => base.value * 2);

export const diamond = variable.compute(() => {
  probe.diamond++;
  return left.value + right.value;
});

export function resetVariable(): void {
  count.value = 0;
  label.value = "cell";
  base.value = 1;
  rowValue.value = 0;
  probe.reads = 0;
  probe.tones = 0;
  probe.diamond = 0;
}
