import { relative } from "node:path";
import type { BuildReport } from "../build/build-report.ts";
import { groupModules } from "../build/package-groups.ts";
import { formatMs, type StartupSteps } from "../build/timings.ts";
import { ANSI } from "./color.ts";
import { plural } from "./dev-detail.ts";
import { renderTree } from "./dev-tree.ts";
import { formatSize } from "./size.ts";
import { styled } from "./style.ts";

const CELL_GAP = "  ";
const EMPTY_ROW = "none";

/** The full `d` report: every boot, style, compile, bundle, output and server line. */
export function formatReport(report: BuildReport, startup: StartupSteps, color: boolean): string {
  return [
    section("boot", bootRows(startup), color),
    section("styles", styleRows(report), color),
    section("compile", compileRows(report), color),
    section("bundle", bundleRows(report), color),
    section("outputs", outputRows(report), color),
    section("server", serverRows(startup), color),
  ].join("\n\n");
}

function section(title: string, rows: string[], color: boolean): string {
  return renderTree(styled(title, ANSI.bold, color), rows.length > 0 ? rows : [EMPTY_ROW], color);
}

function bootRows(startup: StartupSteps): string[] {
  const rows = [`start ${formatMs(startup.boot ?? 0)} ms`];
  if (startup.configMs !== undefined) rows.push(`config ${formatMs(startup.configMs)} ms`);
  return rows;
}

function styleRows(report: BuildReport): string[] {
  return alignRows(
    report.styles.map((style) => [
      `${relative(report.root, style.file)}:${style.index}`,
      style.cached ? "cached" : "compiled",
      `${formatMs(style.ms)} ms`,
    ]),
  );
}

function compileRows(report: BuildReport): string[] {
  const slowestFirst = [...report.compiles].sort((a, b) => b.ms - a.ms);
  return alignRows(
    slowestFirst.map((compile) => [
      relative(report.root, compile.file),
      `${formatMs(compile.ms)} ms`,
    ]),
  );
}

function bundleRows(report: BuildReport): string[] {
  const groups = groupModules(report.modules, report.root);
  const packageRows = alignRows(
    groups.packages.map((group) => [
      group.name,
      plural(group.files, "file"),
      formatSize(group.bytes),
    ]),
  );
  const appRows = alignRows(
    groups.app.map((module) => [relative(report.root, module.path), formatSize(module.bytes)]),
  );
  return [...packageRows, ...appRows];
}

function outputRows(report: BuildReport): string[] {
  const largestFirst = [...report.outputs].sort((a, b) => b.bytes - a.bytes);
  return alignRows(largestFirst.map((output) => [output.path, formatSize(output.bytes)]));
}

function serverRows(startup: StartupSteps): string[] {
  return [`server ${formatMs(startup.server ?? 0)} ms`, `total ${formatMs(startup.total ?? 0)} ms`];
}

/** Pads each column to its widest cell. The last column is right-aligned. */
function alignRows(cells: string[][]): string[] {
  const widths = columnWidths(cells);
  return cells.map((row) =>
    row.map((cell, column) => alignCell(cell, row, column, widths)).join(CELL_GAP),
  );
}

function alignCell(cell: string, row: string[], column: number, widths: number[]): string {
  const width = widths[column] ?? 0;
  return column === row.length - 1 ? cell.padStart(width) : cell.padEnd(width);
}

function columnWidths(cells: string[][]): number[] {
  const widths: number[] = [];
  for (const row of cells) {
    row.forEach((cell, column) => {
      widths[column] = Math.max(widths[column] ?? 0, cell.length);
    });
  }
  return widths;
}
