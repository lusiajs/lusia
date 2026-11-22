import { fileURLToPath } from "node:url";

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

// The build runs first: the test imports its output.
const BUILD: Step = { name: "build", cmd: ["bun", "scripts/build-editor.ts"], cwd: ROOT };

// The steps touch separate outputs, so they run at the same time.
const STEPS: Step[] = [
  { name: "typecheck", cmd: ["bun", "run", "typecheck"], cwd: ROOT },
  { name: "test", cmd: ["bun", "run", "test"], cwd: ROOT },
];

function formatSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

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

async function main(): Promise<void> {
  const start = performance.now();
  const built = await runStep(BUILD);
  const results = [built, ...(await Promise.all(STEPS.map(runStep)))];
  const totalMs = performance.now() - start;
  const allOk = results.every((result) => result.ok);

  console.log(results.map(summaryLine).join("\n"));
  console.log(`check  ${statusLabel(allOk)}  ${formatSeconds(totalMs)}`);

  for (const result of results.filter((item) => !item.ok)) {
    console.log(`\n${failureReport(result)}`);
  }
  process.exitCode = allOk ? 0 : 1;
}

await main();
