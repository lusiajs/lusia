import type { Summary } from "./stats.ts";
import type { VariantResult } from "./bench.ts";

function fixed(value: number, digits = 2): string {
  return value.toFixed(digits);
}

function kilobytes(bytes: number): string {
  return fixed(bytes / 1024, 1);
}

function range(summary: Summary): string {
  return `${fixed(summary.min)} to ${fixed(summary.max)}`;
}

function ratio(value: number, baseline: number): string {
  return baseline === 0 ? "n/a" : `${fixed(value / baseline)}x`;
}

function absoluteTable(results: VariantResult[]): string {
  const header = [
    "| Variant | Initial recalc ms (CDP, median) | Initial recalc min to max | Initial wall ms (median) | Toggle recalc ms (median) | Recalc count | CSS KB | HTML KB | Markers |",
    "|---|---|---|---|---|---|---|---|---|",
  ];
  const rows = results.map((result) =>
    [
      `| ${result.variant.name}`,
      fixed(result.initialCdp.median),
      range(result.initialCdp),
      fixed(result.initialWall.median),
      fixed(result.toggleCdp.median),
      fixed(result.recalcCount.median, 0),
      kilobytes(result.app.cssBytes),
      kilobytes(result.app.htmlBytes),
      `${result.app.markers} |`,
    ].join(" | "),
  );
  return [...header, ...rows].join("\n");
}

function ratioTable(results: VariantResult[]): string {
  const baseline = results[0];
  if (!baseline) return "";
  const header = [
    `| Variant (ratio to ${baseline.variant.name}, smaller is better) | Initial recalc | Initial wall | Toggle recalc |`,
    "|---|---|---|---|",
  ];
  const rows = results.map((result) =>
    [
      `| ${result.variant.name}`,
      ratio(result.initialCdp.median, baseline.initialCdp.median),
      ratio(result.initialWall.median, baseline.initialWall.median),
      `${ratio(result.toggleCdp.median, baseline.toggleCdp.median)} |`,
    ].join(" | "),
  );
  return [...header, ...rows].join("\n");
}

function noiseLines(results: VariantResult[]): string {
  return results
    .map((result) => {
      const repeated = result.repeated ? ", repeated with 30 because noise exceeded 30 percent" : "";
      return `- ${result.variant.name}: initial recalc spread ${fixed(result.initialCdp.spread * 100, 1)} percent, toggle spread ${fixed(result.toggleCdp.spread * 100, 1)} percent, ${result.repetitions} measured runs${repeated}`;
    })
    .join("\n");
}

export function renderReport(results: VariantResult[], chromiumVersion: string): string {
  return [
    "## Style scope benchmark",
    "",
    `Chromium ${chromiumVersion}, headless, --disable-gpu, viewport 1280x800. 300 components, each with a 30-element root, a 8-element child component and a 40-rule stylesheet (12 rules for the child). First run per variant dropped as warm-up.`,
    "",
    "### Absolute numbers",
    "",
    absoluteTable(results),
    "",
    "### Ratio to baseline",
    "",
    ratioTable(results),
    "",
    "### Noise",
    "",
    noiseLines(results),
    "",
  ].join("\n");
}
