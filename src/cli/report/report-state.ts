import type { SortKey, Stage } from "./report-model.ts";
import { expandKey, isExpandable, visibleRows } from "./report-rows.ts";

export const REPORT_KEYS = [
  "up",
  "down",
  "j",
  "k",
  "pageup",
  "pagedown",
  "left",
  "right",
  "tab",
  "shift-tab",
  "s",
  "enter",
  "escape",
  "d",
] as const;

export type ReportKey = (typeof REPORT_KEYS)[number];

export interface ReportState {
  stage: number;
  row: number;
  scroll: number;
  sorts: SortKey[];
  expanded: Set<string>;
}

export function initialState(stages: Stage[]): ReportState {
  return {
    stage: 0,
    row: 0,
    scroll: 0,
    sorts: stages.map((stage) => stage.sorts[0] ?? "name"),
    expanded: new Set(),
  };
}

/** Keeps the scroll window so that `row` is on screen. */
export function followScroll(scroll: number, row: number, pageHeight: number): number {
  const height = Math.max(1, pageHeight);
  if (row < scroll) return row;
  if (row >= scroll + height) return row - height + 1;
  return scroll;
}

export function handleKey(
  state: ReportState,
  stages: Stage[],
  key: ReportKey,
  pageHeight: number,
): ReportState | "close" {
  if (key === "escape" || key === "d") return "close";
  if (key === "left" || key === "shift-tab") return moveStage(state, stages, -1);
  if (key === "right" || key === "tab") return moveStage(state, stages, 1);
  if (key === "s") return cycleSort(state, stages, pageHeight);
  if (key === "enter") return toggleExpand(state, stages);
  const step = rowStep(key, pageHeight);
  return step === undefined ? state : moveRow(state, stages, step, pageHeight);
}

function rowStep(key: ReportKey, pageHeight: number): number | undefined {
  if (key === "up" || key === "k") return -1;
  if (key === "down" || key === "j") return 1;
  if (key === "pageup") return -pageHeight;
  if (key === "pagedown") return pageHeight;
  return undefined;
}

export function moveRow(
  state: ReportState,
  stages: Stage[],
  step: number,
  pageHeight: number,
): ReportState {
  const total = visibleCount(state, stages);
  const row = clamp(state.row + step, 0, Math.max(0, total - 1));
  return { ...state, row, scroll: followScroll(state.scroll, row, pageHeight) };
}

function moveStage(state: ReportState, stages: Stage[], step: number): ReportState {
  const stage = wrap(state.stage + step, stages.length);
  return { ...state, stage, row: 0, scroll: 0 };
}

function cycleSort(state: ReportState, stages: Stage[], pageHeight: number): ReportState {
  const stage = stages[state.stage];
  if (!stage) return state;
  const current = state.sorts[state.stage];
  const next = stage.sorts[wrap(stage.sorts.indexOf(current ?? "name") + 1, stage.sorts.length)];
  if (next === undefined) return state;
  const sorts = [...state.sorts];
  sorts[state.stage] = next;
  return clampRow({ ...state, sorts }, stages, pageHeight);
}

export function clampRow(state: ReportState, stages: Stage[], pageHeight: number): ReportState {
  const total = visibleCount(state, stages);
  const row = clamp(state.row, 0, Math.max(0, total - 1));
  return { ...state, row, scroll: followScroll(state.scroll, row, pageHeight) };
}

export function toggleExpand(state: ReportState, stages: Stage[]): ReportState {
  const stage = stages[state.stage];
  const selected = stage ? visibleRows(stage, state)[state.row] : undefined;
  if (!stage || !selected || selected.depth !== 0 || !isExpandable(selected.row)) return state;
  const key = expandKey(stage, selected.row);
  const expanded = new Set(state.expanded);
  if (expanded.has(key)) expanded.delete(key);
  else expanded.add(key);
  return { ...state, expanded };
}

function visibleCount(state: ReportState, stages: Stage[]): number {
  const stage = stages[state.stage];
  return stage ? visibleRows(stage, state).length : 0;
}

function wrap(index: number, count: number): number {
  return ((index % count) + count) % count;
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}
