import { attach, type Instance } from "lusiajs";
import { createTarget } from "../cells.ts";
import { formatMs, timed, type Result } from "../report.ts";
import Tile from "./Tile.lusia";
import FadeTile from "./FadeTile.lusia";

export const TILES = 2000;
export const DURATION = 300;

export function attachTiles(target: Element, total: number, component = Tile): Instance[] {
  const instances: Instance[] = [];
  for (let i = 0; i < total; i++) instances.push(attach(component, target));
  return instances;
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function countAtEnd(target: Element): number {
  return [...target.querySelectorAll<HTMLElement>("li")].filter(
    (item) => item.style.opacity === "1",
  ).length;
}

export async function run(): Promise<Result[]> {
  const target = createTarget("ul");
  let instances: Instance[] = [];
  const attachMs = timed(() => (instances = attachTiles(target, TILES)));
  await wait(DURATION + 100);
  const atEnd = countAtEnd(target);
  const leaveStart = performance.now();
  await Promise.all(instances.map((instance) => instance.detach()));
  const leaveMs = performance.now() - leaveStart;
  const left = target.childNodes.length;
  target.remove();
  const fadeTarget = createTarget("ul");
  const fadeInstances = attachTiles(fadeTarget, TILES, FadeTile);
  await wait(DURATION + 100);
  const fadeLeaveStart = performance.now();
  await Promise.all(fadeInstances.map((instance) => instance.detach()));
  const fadeLeaveMs = performance.now() - fadeLeaveStart;
  fadeTarget.remove();
  return [
    { name: `Attach ${TILES} tiles, 3 animations each`, value: formatMs(attachMs) },
    { name: `Enter finished (opacity 1), of ${TILES}`, value: String(atEnd) },
    { name: `Leave ${TILES} tiles, animateSpace true (siblings slide)`, value: formatMs(leaveMs) },
    { name: "Nodes left after leave", value: String(left) },
    {
      name: `Leave ${TILES} tiles, animateSpace false (siblings jump)`,
      value: formatMs(fadeLeaveMs),
    },
  ];
}
