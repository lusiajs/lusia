import type { Column, ColumnField, SortKey, Stage } from "./report-model.ts";
import type { MouseAction } from "./report-layout.ts";
import { clampRow, followScroll, moveRow, toggleExpand, type ReportState } from "./report-state.ts";

const WHEEL_ROWS = 3;
const COLUMN_SORTS: Partial<Record<ColumnField, SortKey>> = {
  name: "name",
  ms: "time",
  bytes: "size",
};

export function handleMouse(
  state: ReportState,
  stages: Stage[],
  action: MouseAction,
  pageHeight: number,
): ReportState {
  switch (action.area) {
    case "wheel":
      return moveRow(state, stages, action.direction * WHEEL_ROWS, pageHeight);
    case "stage":
      return selectStage(state, action.index);
    case "row":
      return clickRow(state, stages, action.index, pageHeight);
    case "header":
      return clickHeader(state, stages, action.column, pageHeight);
  }
}

function selectStage(state: ReportState, stage: number): ReportState {
  if (stage === state.stage) return state;
  return { ...state, stage, row: 0, scroll: 0 };
}

/** Selects the row; a package row also toggles its expansion. */
function clickRow(
  state: ReportState,
  stages: Stage[],
  row: number,
  pageHeight: number,
): ReportState {
  const selected = { ...state, row, scroll: followScroll(state.scroll, row, pageHeight) };
  return toggleExpand(selected, stages);
}

function clickHeader(
  state: ReportState,
  stages: Stage[],
  column: number,
  pageHeight: number,
): ReportState {
  const stage = stages[state.stage];
  const sort = columnSort(stage?.columns[column]);
  if (!stage || sort === undefined || !stage.sorts.includes(sort)) return state;
  if (sort === state.sorts[state.stage]) return state;
  const sorts = [...state.sorts];
  sorts[state.stage] = sort;
  return clampRow({ ...state, sorts }, stages, pageHeight);
}

function columnSort(column: Column | undefined): SortKey | undefined {
  return column === undefined ? undefined : COLUMN_SORTS[column.field];
}
