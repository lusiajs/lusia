import { attach, SCREEN } from "lusiajs";
import { createTarget } from "../cells.ts";
import type { Result } from "../report.ts";
import Sized from "./Sized.lusia";

// The page cannot resize its window, so it checks the size it is at. screen.test.ts sweeps every size.
export function run(): Result[] {
  const target = createTarget("div");
  const instance = attach(Sized, target);
  const shown = target.querySelector(".name")?.textContent?.trim() ?? "";
  const padding = getComputedStyle(target.querySelector<HTMLElement>(".card")!).paddingLeft;
  const flagsOn = [SCREEN.PHONE, SCREEN.TABLET, SCREEN.DESKTOP].filter((flag) => flag.get()).length;
  instance.detach();
  target.remove();
  return [
    { name: `Window ${innerWidth}px: screen shown`, value: shown },
    { name: `Window ${innerWidth}px: card padding`, value: padding },
    { name: "SCREEN sizes on at once (expect 1)", value: String(flagsOn) },
  ];
}
