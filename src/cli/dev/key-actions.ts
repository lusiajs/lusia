import type { StartupSteps } from "../build/timings.ts";
import { formatUrlRow, type HeaderUrl } from "../log/dev-header.ts";
import { buildStages } from "../report/report-model.ts";
import { openReportScreen } from "../report/report-screen.ts";
import { startKeys, type KeyActions, type KeyControl } from "./keys.ts";
import { openBrowser } from "./open-browser.ts";
import type { Rebuild } from "./rebuild.ts";
import { formatShortcuts } from "./shortcuts.ts";
import type { UpdatePrinter } from "./update-printer.ts";

const CLEAR_SCREEN = "\x1b[2J\x1b[H";
const NO_REPORT_YET = "No build report yet. Wait for the first build to finish.";

export interface KeyActionOptions {
  urls: HeaderUrl[];
  localUrl: string;
  startup: StartupSteps;
  color: boolean;
  printer: UpdatePrinter;
  rebuild: Rebuild;
  /** Runs on Ctrl+C. Raw mode turns Ctrl+C into a key, so it no longer sends SIGINT. */
  onInterrupt: () => void;
  keys: Pick<KeyControl, "pause" | "resume">;
}

/** Starts the keys when stdin is a terminal. Returns undefined otherwise. */
export function startShortcuts(options: Omit<KeyActionOptions, "keys">): KeyControl | undefined {
  if (!process.stdin.isTTY) return undefined;
  let control: KeyControl | undefined;
  const keys = {
    pause: () => control?.pause(),
    resume: () => control?.resume(),
  };
  control = startKeys({
    input: process.stdin,
    actions: createKeyActions({ ...options, keys }),
    interrupt: options.onInterrupt,
  });
  return control;
}

export function createKeyActions({
  urls,
  localUrl,
  startup,
  color,
  printer,
  rebuild,
  onInterrupt,
  keys,
}: KeyActionOptions): KeyActions {
  return {
    report: () => openReport({ startup, color, printer, rebuild, onInterrupt, keys }),
    reload: () => void rebuild.reload(),
    open: () => openBrowser(localUrl),
    urls: () => printer.print(urls.map((item) => formatUrlRow(item, color)).join("\n")),
    clear: () => process.stderr.write(CLEAR_SCREEN),
    help: () => printer.print(formatShortcuts(color)),
  };
}

type ReportOptions = Pick<
  KeyActionOptions,
  "startup" | "color" | "printer" | "rebuild" | "onInterrupt" | "keys"
>;

function openReport({ startup, color, printer, rebuild, onInterrupt, keys }: ReportOptions): void {
  const report = rebuild.lastReport();
  if (!report) {
    printer.print(NO_REPORT_YET);
    return;
  }
  keys.pause();
  printer.hold();
  openReportScreen({
    stages: buildStages(report, startup),
    input: process.stdin,
    output: process.stderr,
    color,
    onClose: () => {
      keys.resume();
      printer.release();
    },
    onInterrupt,
  });
}
