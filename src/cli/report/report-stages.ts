import { formatMs } from "../build/timings.ts";
import { styled } from "../log/style.ts";
import type { Stage } from "./report-model.ts";
import { INVERSE } from "./report-style.ts";
import { fitWidth, padLeft, padRight } from "./report-text.ts";

const MARKER_SELECTED = "▸";
const MARKER_NONE = " ";

export interface StageListLayout {
  width: number;
  nameWidth: number;
  msWidth: number;
}

export function stageListLayout(stages: Stage[]): StageListLayout {
  const nameWidth = Math.max(...stages.map((stage) => stage.name.length));
  const msWidth = Math.max(...stages.map((stage) => msText(stage).length));
  // marker, space, name, space, time, trailing space
  return { width: 1 + 1 + nameWidth + 1 + msWidth + 1, nameWidth, msWidth };
}

/** One line per stage, starting at the top. The selected stage is marked and inverted. */
export function renderStageList(
  stages: Stage[],
  selected: number,
  height: number,
  width: number,
  color: boolean,
): string[] {
  const layout = stageListLayout(stages);
  return Array.from({ length: height }, (_, index) => {
    const stage = stages[index];
    if (!stage) return fitWidth("", width);
    const isSelected = index === selected;
    const text = stageLine(stage, isSelected, layout, width);
    return isSelected ? styled(text, INVERSE, color) : text;
  });
}

function stageLine(
  stage: Stage,
  isSelected: boolean,
  layout: StageListLayout,
  width: number,
): string {
  const marker = isSelected ? MARKER_SELECTED : MARKER_NONE;
  const name = padRight(stage.name, layout.nameWidth);
  const time = padLeft(msText(stage), layout.msWidth);
  return fitWidth(`${marker} ${name} ${time} `, width);
}

function msText(stage: Stage): string {
  return stage.ms === undefined ? "" : formatMs(stage.ms);
}
