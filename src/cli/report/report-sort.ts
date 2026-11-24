import type { Row, SortKey } from "./report-model.ts";

/** New sorted list. Time and size go largest first, name goes A to Z. Child rows are sorted too. */
export function sortRows(rows: Row[], key: SortKey): Row[] {
  return [...rows].sort((a, b) => compareRows(a, b, key)).map((row) => sortChildren(row, key));
}

function sortChildren(row: Row, key: SortKey): Row {
  if (row.children === undefined) return row;
  return { ...row, children: sortRows(row.children, key) };
}

function compareRows(a: Row, b: Row, key: SortKey): number {
  const difference = compareValue(a, b, key);
  return difference !== 0 ? difference : compareText(a.name, b.name);
}

function compareValue(a: Row, b: Row, key: SortKey): number {
  if (key === "name") return 0;
  if (key === "time") return (b.ms ?? 0) - (a.ms ?? 0);
  return (b.bytes ?? 0) - (a.bytes ?? 0);
}

function compareText(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}
