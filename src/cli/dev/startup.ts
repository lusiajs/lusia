import { now, type StartupSteps, type Steps } from "../build/timings.ts";

export interface StartupTimes {
  started: number;
  types: number;
  styles: number;
  build: Steps;
  total: number;
  configMs?: number;
}

/** Server is the time left over: everything from the first build's end to the header print. */
export function startupSteps({
  started,
  types,
  styles,
  build,
  total,
  configMs,
}: StartupTimes): StartupSteps {
  const sass = styles + (build.sass ?? 0);
  const buildMs = sass + (build.compile ?? 0) + (build.bundle ?? 0);
  const server = total - started - types - buildMs;
  return {
    boot: started,
    types,
    sass,
    compile: build.compile,
    bundle: build.bundle,
    server,
    total,
    configMs,
  };
}
