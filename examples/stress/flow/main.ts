import { attach } from "lusiajs";
import { createTarget } from "../cells.ts";
import { formatMs, timed, type Result } from "../report.ts";
import { on } from "./on.ts";
import Toggle from "./Toggle.lusia";

export const TOGGLES = 1000;
// Longer than the 20 ms OUT animation, so every leave has finished.
export const SETTLE_MS = 200;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function run(): Promise<Result[]> {
  const target = createTarget("div");
  const instance = attach(Toggle, target);
  const toggleMs = timed(() => {
    for (let i = 0; i < TOGGLES; i++) on.value = !on.value;
  });
  await wait(SETTLE_MS);
  const left = target.querySelectorAll(".badge").length;
  await instance.detach();
  target.remove();
  on.value = false;
  return [
    { name: `IF toggled ${TOGGLES} times (OUT animations)`, value: formatMs(toggleMs) },
    { name: "Badges left after the leaves finish (expect 0)", value: String(left) },
  ];
}
