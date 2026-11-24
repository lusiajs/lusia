import { relative } from "node:path";
import type { BuildReport } from "../build/build-report.ts";
import { buildBundleStage } from "./report-bundle.ts";
import type { StartupSteps } from "../build/timings.ts";

export type SortKey = "time" | "size" | "name";
export type ColumnField = "name" | "state" | "ms" | "bytes" | "files";

export interface Column {
  label: string;
  field: ColumnField;
}

export interface Row {
  name: string;
  state?: string;
  ms?: number;
  bytes?: number;
  files?: number;
  children?: Row[];
}

export interface Stage {
  name: string;
  ms?: number;
  columns: Column[];
  rows: Row[];
  sorts: SortKey[];
}

export function buildStages(report: BuildReport, startup: StartupSteps): Stage[] {
  return [
    bootStage(startup),
    stylesStage(report),
    compileStage(report),
    buildBundleStage(report, startup),
    outputsStage(report),
    serverStage(startup),
  ];
}

function bootStage(startup: StartupSteps): Stage {
  const rows: Row[] = [{ name: "start", ms: startup.boot ?? 0 }];
  if (startup.configMs !== undefined) rows.push({ name: "config", ms: startup.configMs });
  return {
    name: "boot",
    ms: startup.boot,
    columns: [
      { label: "step", field: "name" },
      { label: "time", field: "ms" },
    ],
    rows,
    sorts: ["time"],
  };
}

function stylesStage(report: BuildReport): Stage {
  const rows = report.styles.map((style) => ({
    name: `${relative(report.root, style.file)}:${style.index}`,
    state: style.cached ? "cached" : "compiled",
    ms: style.ms,
  }));
  return {
    name: "styles",
    ms: sum(rows.map((row) => row.ms)),
    columns: [
      { label: "file", field: "name" },
      { label: "state", field: "state" },
      { label: "time", field: "ms" },
    ],
    rows,
    sorts: ["time", "name"],
  };
}

function compileStage(report: BuildReport): Stage {
  const rows = report.compiles.map((compile) => ({
    name: relative(report.root, compile.file),
    state: compile.cached ? "cached" : "compiled",
    ms: compile.ms,
    bytes: compile.bytes,
  }));
  return {
    name: "compile",
    ms: sum(rows.map((row) => row.ms)),
    columns: [
      { label: "file", field: "name" },
      { label: "state", field: "state" },
      { label: "time", field: "ms" },
      { label: "size", field: "bytes" },
    ],
    rows,
    sorts: ["time", "size", "name"],
  };
}

function outputsStage(report: BuildReport): Stage {
  const rows = report.outputs.map((output) => ({
    name: relative(report.root, output.path),
    bytes: output.bytes,
  }));
  return {
    name: "outputs",
    columns: [
      { label: "file", field: "name" },
      { label: "size", field: "bytes" },
    ],
    rows,
    sorts: ["size", "name"],
  };
}

function serverStage(startup: StartupSteps): Stage {
  return {
    name: "server",
    ms: startup.server,
    columns: [
      { label: "step", field: "name" },
      { label: "time", field: "ms" },
    ],
    rows: [
      { name: "cache", ms: startup.cache ?? 0 },
      { name: "server", ms: startup.server ?? 0 },
      { name: "total", ms: startup.total ?? 0 },
    ],
    sorts: ["time"],
  };
}

function sum(values: (number | undefined)[]): number {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
}
