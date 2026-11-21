import { variable } from "lusiajs";

export interface Row {
  id: number;
  label: string;
}

// The list reads this variable. Scenarios replace it to create, reorder, keep and remove rows.
export const rows = variable<Row[]>([]);

export function makeRows(count: number, from = 0): Row[] {
  return Array.from({ length: count }, (_, offset) => ({
    id: from + offset,
    label: `Row ${from + offset}`,
  }));
}

// A fixed pseudo-random order, so every run shuffles the same way.
export function shuffled(items: Row[]): Row[] {
  return [...items].sort((a, b) => scramble(a.id) - scramble(b.id));
}

function scramble(id: number): number {
  return (id * 2654435761) % 4294967296;
}
