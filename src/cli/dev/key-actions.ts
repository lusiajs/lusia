import { emptyReport } from "../build/build-report.ts";
import type { StartupSteps } from "../build/timings.ts";
import { formatUrlRow, type HeaderUrl } from "../log/dev-header.ts";
import { formatReport } from "../log/dev-report.ts";
import { startKeys, type KeyActions, type KeyControl } from "./keys.ts";
import { openBrowser } from "./open-browser.ts";
import type { Rebuild } from "./rebuild.ts";
import { formatShortcuts } from "./shortcuts.ts";
import type { UpdatePrinter } from "./update-printer.ts";

const CLEAR_SCREEN = "\x1b[2J\x1b[H";

export interface KeyActionOptions {
  root: string;
  urls: HeaderUrl[];
  localUrl: string;
  startup: StartupSteps;
  color: boolean;
  printer: UpdatePrinter;
  rebuild: Rebuild;
}

/** Starts the keys when stdin is a terminal. Returns undefined otherwise. */
export function startShortcuts(
  options: KeyActionOptions & { onInterrupt: () => void },
): KeyControl | undefined {
  if (!process.stdin.isTTY) return undefined;
  return startKeys({
    input: process.stdin,
    actions: createKeyActions(options),
    interrupt: options.onInterrupt,
  });
}

export function createKeyActions({
  root,
  urls,
  localUrl,
  startup,
  color,
  printer,
  rebuild,
}: KeyActionOptions): KeyActions {
  return {
    report: () =>
      printer.print(formatReport(rebuild.lastReport() ?? emptyReport(root), startup, color)),
    reload: () => void rebuild.reload(),
    open: () => openBrowser(localUrl),
    urls: () => printer.print(urls.map((item) => formatUrlRow(item, color)).join("\n")),
    clear: () => process.stderr.write(CLEAR_SCREEN),
    help: () => printer.print(formatShortcuts(color)),
  };
}
