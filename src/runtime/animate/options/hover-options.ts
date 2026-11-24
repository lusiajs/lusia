import { runtimeError } from "../../errors.ts";
import { HOVER_AREA, type HoverArea } from "../modes/hover-modes.ts";
import type { Keyframes } from "./keyframes.ts";
import type { OptionsBase } from "./trigger-options.ts";
import { animateConfig } from "./config-store.ts";
import { readMs } from "./read-ms.ts";

/** The `options` of ON.HOVER. Times are in ms. `out` replaces the play back for leaving. */
export interface HoverOptions {
  area?: HoverArea;
  inDelay?: number;
  outDelay?: number;
  out?: Keyframes;
  outDuration?: number;
}

export interface HoverRead {
  area: HoverArea;
  inDelay: number;
  outDelay: number;
  out: { keyframes: Keyframes; duration: number } | undefined;
}

export function hoverDefault(): HoverRead {
  const hover = animateConfig().hover ?? {};
  return {
    area: HOVER_AREA.FINAL,
    inDelay: hover.inDelay ?? 0,
    outDelay: hover.outDelay ?? 0,
    out: undefined,
  };
}

export function readHover(options: HoverOptions, base: OptionsBase): HoverRead {
  if (options.out === undefined && options.outDuration !== undefined) throw runtimeError("L2013");
  const fallback = hoverDefault();
  return {
    area: readArea(options.area),
    inDelay: readMs(options.inDelay, fallback.inDelay, "options inDelay"),
    outDelay: readMs(options.outDelay, fallback.outDelay, "options outDelay"),
    out: options.out === undefined ? undefined : readOut(options, base),
  };
}

function readArea(area: HoverArea | undefined): HoverArea {
  if (area === undefined) return HOVER_AREA.FINAL;
  if (area !== HOVER_AREA.FINAL && area !== HOVER_AREA.ELEMENT) throw runtimeError("L2060");
  return area;
}

export function sameHover(a: HoverRead, b: HoverRead): boolean {
  return (
    a.area === b.area &&
    a.inDelay === b.inDelay &&
    a.outDelay === b.outDelay &&
    a.out?.keyframes === b.out?.keyframes &&
    a.out?.duration === b.out?.duration
  );
}

/** The leave play lasts the item's duration unless `outDuration` or the config's hover.outDuration sets it. */
function readOut(
  { out, outDuration }: HoverOptions,
  base: OptionsBase,
): NonNullable<HoverRead["out"]> {
  if (typeof out !== "object" || out === null || Array.isArray(out)) {
    throw runtimeError("L2014");
  }
  const fallback = animateConfig().hover?.outDuration ?? base.duration;
  return { keyframes: out, duration: readMs(outDuration, fallback, "options outDuration") };
}
