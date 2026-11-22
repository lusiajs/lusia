import { attach } from "lusiajs";
import { createTarget } from "../cells.ts";
import { formatMs, timed, type Result } from "../report.ts";
import { CARD_COUNT, counts, keptStops } from "./cards.ts";
import { spyOnListeners } from "./listener-spy.ts";
import Watcher from "./Watcher.lusia";

export const CYCLES = 20;

export function run(): Result[] {
  const spy = spyOnListeners();
  const baseline = spy.documentListeners();
  const target = createTarget("div");
  let peakDocument = 0;
  let peakObserved = 0;
  let keptLog: HTMLElement | null = null;
  const cycleMs = timed(() => {
    for (let cycle = 0; cycle < CYCLES; cycle++) {
      const instance = attach(Watcher, target);
      keptLog = target.querySelector<HTMLElement>(".log");
      peakDocument = Math.max(peakDocument, spy.documentListeners() - baseline);
      peakObserved = Math.max(peakObserved, spy.observedElements());
      instance.detach();
    }
  });
  const leftDocument = spy.documentListeners() - baseline;
  const leftObserved = spy.observedElements();

  keptLog!.click();
  const clicksAfterDetach = counts.logClicks;
  keptStops.splice(0).forEach((stop) => stop());
  keptLog!.click();
  const clicksAfterStop = counts.logClicks;

  target.remove();
  spy.restore();
  return [
    { name: `Mount and detach ${CARD_COUNT} cards, ${CYCLES} times`, value: formatMs(cycleMs) },
    {
      name: "Peak document listeners while mounted (expect 2, shared by every card)",
      value: String(peakDocument),
    },
    {
      name: `Peak IntersectionObserver targets while mounted (expect ${CARD_COUNT})`,
      value: String(peakObserved),
    },
    { name: "Document listeners left after detach (expect 0)", value: String(leftDocument) },
    {
      name: "IntersectionObserver targets left after detach (expect 0)",
      value: String(leftObserved),
    },
    { name: "keepRunning log clicks after detach (expect 1)", value: String(clicksAfterDetach) },
    { name: "keepRunning log clicks after stop (expect 1)", value: String(clicksAfterStop) },
  ];
}
