import { attach, type Instance } from "lusiajs";
import { createTarget } from "../cells.ts";
import { formatMs, timed, type Result } from "../report.ts";
import Mover from "./Mover.lusia";

export const MOVERS = 1000;
const WINDOW_MS = 1000;
const NARROW = "40%";
const WIDE = "100%";

export async function run(): Promise<Result[]> {
  const target = createTarget("ul");
  target.style.cssText = "display: flex; flex-wrap: wrap; gap: 4px; padding: 0; width: 100%;";
  let instances: Instance[] = [];
  const attachMs = timed(() => (instances = attachMovers(target, MOVERS)));
  await nextFrame();
  const frames = await countFrames(WINDOW_MS, () => toggleWidth(target));
  await Promise.all(instances.map((instance) => instance.detach()));
  target.remove();
  return [
    { name: `Attach ${MOVERS} movers`, value: formatMs(attachMs) },
    { name: `Frames in ${WINDOW_MS} ms while all ${MOVERS} glide`, value: String(frames) },
  ];
}

function attachMovers(target: Element, total: number): Instance[] {
  const instances: Instance[] = [];
  for (let i = 0; i < total; i++) instances.push(attach(Mover, target));
  return instances;
}

function toggleWidth(target: HTMLElement): void {
  target.style.width = target.style.width === NARROW ? WIDE : NARROW;
}

function nextFrame(): Promise<number> {
  return new Promise((resolve) => requestAnimationFrame(resolve));
}

/** Counts the animation frames that run in `ms` after `change`. */
async function countFrames(ms: number, change: () => void): Promise<number> {
  change();
  const start = performance.now();
  let frames = 0;
  while (performance.now() - start < ms) {
    await nextFrame();
    frames++;
  }
  return frames;
}
