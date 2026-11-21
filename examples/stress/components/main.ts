import type { Instance } from "lusiajs";
import { createTarget } from "../cells.ts";
import { formatMs, timed, type Result } from "../report.ts";
import { rowValue } from "../variable.ts";
import { attachTables, detachTables, PARENTS, ROWS_PER_TABLE } from "./tables.ts";

const ROWS = PARENTS * ROWS_PER_TABLE;

export async function run(): Promise<Result[]> {
  const target = createTarget("div");
  let instances: Instance[] = [];
  const attachMs = timed(() => (instances = attachTables(target, PARENTS)));
  const updateMs = timed(() => (rowValue.value = 1));
  const detachMs = timed(() => detachTables(instances));
  target.remove();
  return [
    { name: `Attach ${PARENTS} tables x ${ROWS_PER_TABLE} rows`, value: formatMs(attachMs) },
    { name: `One prop update reaching ${ROWS} rows`, value: formatMs(updateMs) },
    { name: `Detach ${PARENTS} tables`, value: formatMs(detachMs) },
  ];
}
