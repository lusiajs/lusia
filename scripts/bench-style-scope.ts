import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { benchVariant, type VariantResult } from "./bench-style/bench.ts";
import { buildApp } from "./bench-style/app.ts";
import { renderReport } from "./bench-style/report.ts";
import { compareWithReference, type Equivalence } from "./bench-style/verify.ts";
import { VARIANTS } from "./bench-style/variants.ts";

const REFERENCE_NAME = "lusia-scoped";

function describeEquivalence(results: Equivalence[]): string {
  const lines = results.map(
    (result) => `- ${result.name}: ${result.differing} of ${result.elements} elements styled differently`,
  );
  return `\n### Equivalence check\n\nEvery variant is compared with ${REFERENCE_NAME} (it styles only a component's own elements). The tree mode also styles child components by design, so it is expected to differ.\n\n${lines.join("\n")}\n`;
}

async function checkEquivalence(browser: Awaited<ReturnType<typeof chromium.launch>>): Promise<string> {
  const reference = VARIANTS.find((variant) => variant.name === REFERENCE_NAME)!;
  const others = VARIANTS.filter((variant) => variant.name !== REFERENCE_NAME).map((variant) => ({
    name: variant.name,
    app: buildApp(variant),
  }));
  const results = await compareWithReference(
    browser,
    { name: reference.name, app: buildApp(reference) },
    others,
  );
  return describeEquivalence(results);
}

const CHROMIUM_PATH = process.env.LUSIA_CHROMIUM ?? "/usr/bin/chromium";
const REPORT_PATH = fileURLToPath(new URL("../.agent/bench-style-result.md", import.meta.url));

async function main(): Promise<void> {
  const browser = await chromium.launch({
    executablePath: CHROMIUM_PATH,
    headless: true,
    args: ["--disable-gpu"],
  });
  const results: VariantResult[] = [];
  try {
    for (const variant of VARIANTS) {
      console.error(`benchmarking ${variant.name}`);
      results.push(await benchVariant(browser, variant));
    }
    const equivalence = await checkEquivalence(browser);
    const report = renderReport(results, browser.version()) + equivalence;
    console.log(report);
    await mkdir(fileURLToPath(new URL("../.agent/", import.meta.url)), { recursive: true });
    await writeFile(REPORT_PATH, report);
    console.error(`wrote ${REPORT_PATH}`);
  } finally {
    await browser.close();
  }
}

await main();
