import { mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { formatSeconds, slowestReport } from "./check-report.ts";

interface Step {
  name: string;
  cmd: string[];
  cwd: string;
}

interface StepResult {
  name: string;
  ok: boolean;
  ms: number;
  output: string;
}

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const TEST_REPORT = join(ROOT, "node_modules", ".cache", "lusia", "test-report.xml");
const TEST_ARGS = ["--parallel=6", "./test/", "./examples/"];
const TEST_REPORT_ARGS = ["--reporter=junit", `--reporter-outfile=${TEST_REPORT}`];

// The steps touch separate outputs, so they run at the same time.
const STEPS: Step[] = [
  { name: "typecheck", cmd: ["bun", "run", "typecheck"], cwd: ROOT },
  { name: "test", cmd: ["bun", "test", ...TEST_ARGS, ...TEST_REPORT_ARGS], cwd: ROOT },
];

function statusLabel(ok: boolean): string {
  return ok ? "ok" : "FAIL";
}

async function runStep(step: Step): Promise<StepResult> {
  const start = performance.now();
  const proc = Bun.spawn(step.cmd, { cwd: step.cwd, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([
    Bun.readableStreamToText(proc.stdout),
    Bun.readableStreamToText(proc.stderr),
    proc.exited,
  ]);
  return {
    name: step.name,
    ok: code === 0,
    ms: performance.now() - start,
    output: stdout + stderr,
  };
}

function summaryLine(result: StepResult): string {
  return `${result.name.padEnd(12)}  ${statusLabel(result.ok).padEnd(4)}  ${formatSeconds(result.ms)}`;
}

function failureReport(result: StepResult): string {
  return `--- ${result.name} output ---\n${result.output.trimEnd()}`;
}

async function prepareReportPath(): Promise<void> {
  await mkdir(dirname(TEST_REPORT), { recursive: true });
  await rm(TEST_REPORT, { force: true });
}

async function readTestReport(): Promise<string> {
  return Bun.file(TEST_REPORT).text().catch(() => "");
}

async function printSlowest(): Promise<void> {
  const report = slowestReport(await readTestReport());
  if (report) {
    console.log(`\n${report}`);
  }
}

async function main(): Promise<void> {
  const start = performance.now();
  await prepareReportPath();
  const results = await Promise.all(STEPS.map(runStep));
  const totalMs = performance.now() - start;
  const allOk = results.every((result) => result.ok);

  console.log(results.map(summaryLine).join("\n"));
  console.log(`check  ${statusLabel(allOk)}  ${formatSeconds(totalMs)}`);
  await printSlowest();

  for (const result of results.filter((item) => !item.ok)) {
    console.log(`\n${failureReport(result)}`);
  }
  process.exitCode = allOk ? 0 : 1;
}

await main();
