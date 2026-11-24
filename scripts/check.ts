import { mkdir, rm } from "node:fs/promises";
import { availableParallelism } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { formatSeconds, slowestReport } from "./check-report.ts";

interface Step {
  name: string;
  cmd: string[];
  cwd: string;
  note?: string;
}

interface StepResult {
  name: string;
  ok: boolean;
  ms: number;
  output: string;
  note?: string;
}

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const TEST_REPORT = join(ROOT, "node_modules", ".cache", "lusia", "test-report.xml");
const TEST_REPORT_ARGS = ["--reporter=junit", `--reporter-outfile=${TEST_REPORT}`];
const NICE_LEVEL = "10";
const NICE_PLATFORMS = new Set(["linux", "darwin"]);

function testParallel(): number {
  const max = Number(process.env.LUSIA_TEST_PARALLEL);
  const hasMax = Number.isInteger(max) && max >= 1;
  return hasMax ? max : availableParallelism();
}

const PARALLEL = testParallel();
const TEST_ARGS = [`--parallel=${PARALLEL}`, "./test/", "./examples/"];

// The steps touch separate outputs, so they run at the same time.
const STEPS: Step[] = [
  { name: "typecheck", cmd: ["bun", "run", "typecheck"], cwd: ROOT },
  {
    name: "test",
    cmd: ["bun", "test", ...TEST_ARGS, ...TEST_REPORT_ARGS],
    cwd: ROOT,
    note: `(parallel ${PARALLEL})`,
  },
];

function statusLabel(ok: boolean): string {
  return ok ? "ok" : "FAIL";
}

// Lower priority keeps the desktop responsive while the steps run.
function lowPriorityCmd(cmd: string[]): string[] {
  const canNice = NICE_PLATFORMS.has(process.platform) && Bun.which("nice") !== null;
  return canNice ? ["nice", "-n", NICE_LEVEL, ...cmd] : cmd;
}

async function runStep(step: Step): Promise<StepResult> {
  const start = performance.now();
  const proc = Bun.spawn(lowPriorityCmd(step.cmd), {
    cwd: step.cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
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
    note: step.note,
  };
}

function summaryLine(result: StepResult): string {
  const line = `${result.name.padEnd(12)}  ${statusLabel(result.ok).padEnd(4)}  ${formatSeconds(result.ms)}`;
  return result.note ? `${line}  ${result.note}` : line;
}

function failureReport(result: StepResult): string {
  return `--- ${result.name} output ---\n${result.output.trimEnd()}`;
}

async function prepareReportPath(): Promise<void> {
  await mkdir(dirname(TEST_REPORT), { recursive: true });
  await rm(TEST_REPORT, { force: true });
}

async function readTestReport(): Promise<string> {
  return Bun.file(TEST_REPORT)
    .text()
    .catch(() => "");
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
