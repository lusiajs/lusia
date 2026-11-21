import { attach } from "lusiajs";
import { createTarget } from "../cells.ts";
import { formatMs, timed, type Result } from "../report.ts";
import List from "./List.lusia";
import { makeRows, rows, shuffled } from "./rows.ts";

export const ROWS = 10000;

export async function run(): Promise<Result[]> {
  const target = createTarget("div");
  const instance = attach(List, target);
  const create = timed(() => (rows.value = makeRows(ROWS)));
  const reverse = timed(() => (rows.value = [...rows.value].reverse()));
  const shuffle = timed(() => (rows.value = shuffled(rows.value)));
  const reuse = timed(() => {
    const kept = rows.value.filter((row) => row.id % 2 === 0);
    rows.value = [...kept, ...makeRows(ROWS / 2, ROWS)];
  });
  const remove = timed(() => (rows.value = []));
  await instance.detach();
  target.remove();
  return [
    { name: `Create ${ROWS} rows`, value: formatMs(create) },
    { name: `Reverse ${ROWS} rows`, value: formatMs(reverse) },
    { name: `Shuffle ${ROWS} rows`, value: formatMs(shuffle) },
    { name: `Keyed reuse: keep ${ROWS / 2}, add ${ROWS / 2}`, value: formatMs(reuse) },
    { name: `Remove ${ROWS} rows`, value: formatMs(remove) },
  ];
}
