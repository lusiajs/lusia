import type { BuildReport } from "#cli/build/build-report.ts";
import type { StartupSteps } from "#cli/build/timings.ts";

export const fakeReport: BuildReport = {
  root: "/app",
  styles: [
    { file: "/app/src/A.lusia", index: 0, cached: true, ms: 1 },
    { file: "/app/src/B.lusia", index: 0, cached: false, ms: 9.5 },
  ],
  compiles: [
    { file: "/app/src/A.lusia", ms: 3.1, bytes: 1200 },
    { file: "/app/src/B.lusia", ms: 12, bytes: 800 },
  ],
  modules: [
    { path: "/app/node_modules/lib/index.js", bytes: 5000 },
    { path: "/app/node_modules/lib/util.js", bytes: 1000 },
    { path: "/app/src/A.lusia", bytes: 2000 },
  ],
  outputs: [{ path: "/app/dist/app.js", bytes: 9000 }],
};

export const fakeStartup: StartupSteps = {
  boot: 24,
  configMs: 2,
  bundle: 148,
  server: 10,
  total: 200,
};
