import type { Instance } from "lusiajs";
import { attachCells, createTarget, detachCells } from "../cells.ts";
import { formatMs, timed, type Result } from "../report.ts";

const CELLS = 2000;

export async function run(): Promise<Result[]> {
  const target = createTarget("ul");
  let instances: Instance[] = [];
  const attachMs = timed(() => (instances = attachCells(target, CELLS)));
  const detachMs = timed(() => detachCells(instances));
  target.remove();
  return [
    { name: `Attach ${CELLS} cells`, value: formatMs(attachMs) },
    { name: `Detach ${CELLS} cells`, value: formatMs(detachMs) },
  ];
}
