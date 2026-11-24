import type { StartupSteps } from "../build/timings.ts";
import { formatUrlRow, type HeaderUrl } from "../log/dev-header.ts";
import { buildStages } from "../report/report-model.ts";
import { openReportScreen } from "../report/report-screen.ts";
import { startKeys, type KeyActions, type KeyControl } from "./keys.ts";
import { openBrowser } from "./open-browser.ts";
import type { Rebuild } from "./rebuild.ts";
import { formatShortcutGrid, formatShortcuts } from "./shortcuts.ts";
import type { UpdatePrinter } from "./update-printer.ts";

const CLEAR_SCREEN = "\x1b[2J\x1b[H";
const NO_REPORT_YET = "No build report yet. Wait for the first build to finish.";
const DEFAULT_TERMINAL_COLUMNS = 80;

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
  output: Pick<NodeJS.WriteStream, "write">;
  columns: number;
}

export interface StartShortcutsOptions extends Omit<
  KeyActionOptions,
  "keys" | "output" | "columns"
> {
  /** Hides the key grid on start. */
  quiet?: boolean;
}

/** Starts the keys when stdin is a terminal. Returns undefined otherwise. */
export function startShortcuts(options: StartShortcutsOptions): KeyControl | undefined {
  if (!process.stdin.isTTY) return undefined;
  const columns = terminalColumns();
  if (!options.quiet) options.printer.print(formatShortcutGrid(columns, options.color));
  let control: KeyControl | undefined;
  const keys = {
    pause: () => control?.pause(),
    resume: () => control?.resume(),
  };
  control = startKeys({
    input: process.stdin,
    actions: createKeyActions({ ...options, keys, output: process.stderr, columns }),
    interrupt: options.onInterrupt,
  });
  return control;
}

function terminalColumns(): number {
  const columns = process.stderr.columns;
  return columns && columns > 0 ? columns : DEFAULT_TERMINAL_COLUMNS;
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
  output,
  columns,
}: KeyActionOptions): KeyActions {
  return {
    report: () => openReport({ startup, color, printer, rebuild, onInterrupt, keys }),
    reload: () => void rebuild.reload(),
    open: () => openBrowser(localUrl),
    urls: () => printer.print(formatUrls(urls, color)),
    clear: () => clearAndRedraw({ urls, color, printer, output, columns }),
    help: () => printer.print(formatShortcuts(color)),
  };
}

function formatUrls(urls: HeaderUrl[], color: boolean): string {
  return urls.map((item) => formatUrlRow(item, color)).join("\n");
}

function clearAndRedraw({
  urls,
  color,
  printer,
  output,
  columns,
}: Pick<KeyActionOptions, "urls" | "color" | "printer" | "output" | "columns">): void {
  output.write(CLEAR_SCREEN);
  printer.print(formatUrls(urls, color));
  printer.print(formatShortcutGrid(columns, color));
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
