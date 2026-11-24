import { describe, expect, test } from "bun:test";
import { buildStages } from "#cli/report/report-model.ts";
import { renderReport } from "#cli/report/report-view.ts";
import { initialState, type ReportState } from "#cli/report/report-state.ts";
import { stripAnsi } from "#cli/log/color.ts";
import { fakeReport, fakeStartup } from "./fake-report.ts";

const stages = buildStages(fakeReport, fakeStartup);
const WIDTH = 80;
const HEIGHT = 20;

function render(state: ReportState = initialState(stages), color = false): string[] {
  return renderReport(stages, state, WIDTH, HEIGHT, color);
}

describe("renderReport at 80x20 without color", () => {
  test("returns exactly the height, and no line is wider than the width", () => {
    const lines = render();
    expect(lines).toHaveLength(HEIGHT);
    for (const line of lines) expect(line.length).toBeLessThanOrEqual(WIDTH);
  });

  test("every line is exactly the width, so the box closes on the right", () => {
    for (const line of render()) expect(line).toHaveLength(WIDTH);
  });

  test("the title shows the sort of the selected stage", () => {
    expect(render()[0]).toContain("sort: time ▼   (s)");
  });

  test("the selected stage has the marker and the table header is the stage's columns", () => {
    const lines = render();
    expect(lines[2]).toContain("▸ boot");
    expect(lines[2]).toContain("step");
    expect(lines[2]).toContain("time");
  });

  test("the bottom right shows the selected row and the total", () => {
    expect(render()[HEIGHT - 3]).toContain("1 / 2");
  });

  test("the footer has the key help", () => {
    expect(render()[HEIGHT - 1]).toContain("esc close");
  });

  test("uses plain ASCII box characters and no escape codes", () => {
    const text = render().join("\n");
    expect(text).toContain("+");
    expect(text).not.toContain("│");
    expect(text).not.toContain("\x1b[");
  });

  test("keeps one space before the table's right border", () => {
    for (const line of render().slice(2, HEIGHT - 3)) expect(line.at(-2)).toBe(" ");
  });

  test("the sort label follows the current sort", () => {
    const state: ReportState = { ...initialState(stages), stage: 1 };
    state.sorts[1] = "name";
    expect(render(state)[0]).toContain("sort: name ▲   (s)");
  });
});

describe("renderReport with color", () => {
  test("marks the selected table row with inverse video", () => {
    const colored = render(initialState(stages), true);
    expect(colored.some((line) => line.includes("\x1b[7m"))).toBe(true);
    expect(colored.map(stripAnsi).every((line) => line.length === WIDTH)).toBe(true);
  });

  test("uses unicode box characters", () => {
    expect(render(initialState(stages), true)[1]).toContain("┌");
  });
});
