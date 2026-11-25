import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { RenderRequest, RenderResult } from "./types.ts";

const WORKER = fileURLToPath(new URL("./render-worker.ts", import.meta.url));

/** Renders one route in its own bun process, so each route starts with a fresh router and DOM. */
export async function renderRoute(
  request: Omit<RenderRequest, "resultPath">,
): Promise<RenderResult> {
  const folder = await mkdtemp(join(tmpdir(), "lusia-render-"));
  try {
    const resultPath = join(folder, "result.json");
    const json = JSON.stringify({ ...request, resultPath });
    const proc = Bun.spawn([process.execPath, WORKER, json], { stdout: "ignore", stderr: "pipe" });
    const code = await proc.exited;
    if (code !== 0) throw new Error((await new Response(proc.stderr).text()).trim());
    return JSON.parse(await readFile(resultPath, "utf8")) as RenderResult;
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
}
