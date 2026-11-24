import type { Row, Stage } from "./report-model.ts";
import { sortRows } from "./report-sort.ts";
import type { ReportState } from "./report-state.ts";

export interface VisibleRow {
  row: Row;
  depth: number;
  expanded: boolean;
}

/** The selected stage's rows in the current sort, with the children of expanded rows after them. */
export function visibleRows(stage: Stage, state: ReportState): VisibleRow[] {
  const sorted = sortRows(stage.rows, state.sorts[state.stage] ?? "name");
  return sorted.flatMap((row) => {
    const expanded = isExpanded(stage, row, state);
    const parent: VisibleRow = { row, depth: 0, expanded };
    if (!expanded) return [parent];
    const children = (row.children ?? []).map((child): VisibleRow => ({
      row: child,
      depth: 1,
      expanded: false,
    }));
    return [parent, ...children];
  });
}

export function isExpandable(row: Row): boolean {
  return (row.children?.length ?? 0) > 0;
}

export function expandKey(stage: Stage, row: Row): string {
  return `${stage.name}/${row.name}`;
}

export function isExpanded(stage: Stage, row: Row, state: ReportState): boolean {
  return state.expanded.has(expandKey(stage, row));
}
