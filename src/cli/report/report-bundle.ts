import { relative } from "node:path";
import type { BuildReport, SizedPath } from "../build/build-report.ts";
import { groupModules, packageName } from "../build/package-groups.ts";
import type { StartupSteps } from "../build/timings.ts";
import type { Row, Stage } from "./report-model.ts";

export function buildBundleStage(report: BuildReport, startup: StartupSteps): Stage {
  const groups = groupModules(report.modules, report.root);
  const filesByPackage = modulesByPackage(report.modules, report.root);
  const packageRows: Row[] = groups.packages.map((group) => ({
    name: group.name,
    files: group.files,
    bytes: group.bytes,
    children: (filesByPackage.get(group.name) ?? []).map((module) => fileRow(module, report.root)),
  }));
  const appRows = groups.app.map((module) => fileRow(module, report.root));
  return {
    name: "bundle",
    ms: startup.bundle,
    columns: [
      { label: "package", field: "name" },
      { label: "files", field: "files" },
      { label: "size", field: "bytes" },
    ],
    rows: [...packageRows, ...appRows],
    sorts: ["size", "name"],
  };
}

function fileRow(module: SizedPath, root: string): Row {
  return { name: relative(root, module.path), bytes: module.bytes };
}

function modulesByPackage(modules: SizedPath[], root: string): Map<string, SizedPath[]> {
  const byPackage = new Map<string, SizedPath[]>();
  for (const module of modules) {
    const name = packageName(module.path, root);
    if (name === undefined) continue;
    const list = byPackage.get(name) ?? [];
    list.push(module);
    byPackage.set(name, list);
  }
  return byPackage;
}
