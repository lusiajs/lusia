import type { Stage } from "./report-model.ts";
import { keyName } from "./terminal-keys.ts";
import { handleKey, initialState, REPORT_KEYS, type ReportKey } from "./report-state.ts";
import { renderReport, reportBodyHeight } from "./report-view.ts";

const ENTER_SCREEN = "\x1b[?1049h";
const LEAVE_SCREEN = "\x1b[?1049l";
const HIDE_CURSOR = "\x1b[?25l";
const SHOW_CURSOR = "\x1b[?25h";
const CURSOR_HOME = "\x1b[H";
const CLEAR_SCREEN = "\x1b[2J";
const DEFAULT_COLUMNS = 80;
const DEFAULT_ROWS = 24;
const INTERRUPT_KEY = "ctrl-c";

type DataListener = (chunk: Buffer | string) => void;

export interface ScreenInput {
  on(event: "data", listener: DataListener): unknown;
  off(event: "data", listener: DataListener): unknown;
}

export interface ScreenOutput {
  columns?: number;
  rows?: number;
  write(text: string): unknown;
  on(event: "resize", listener: () => void): unknown;
  off(event: "resize", listener: () => void): unknown;
}

export interface ReportScreenOptions {
  stages: Stage[];
  input: ScreenInput;
  output: ScreenOutput;
  color: boolean;
  onClose: () => void;
  onInterrupt: () => void;
}

/** Full-screen build report on the alternate buffer. Closing restores the screen underneath. */
export function openReportScreen({
  stages,
  input,
  output,
  color,
  onClose,
  onInterrupt,
}: ReportScreenOptions): void {
  let state = initialState(stages);
  output.write(ENTER_SCREEN + HIDE_CURSOR);
  draw(CURSOR_HOME);
  input.on("data", onData);
  output.on("resize", onResize);

  function draw(prefix: string): void {
    const lines = renderReport(stages, state, columns(), rows(), color);
    output.write(prefix + lines.join("\n"));
  }

  function onResize(): void {
    draw(CLEAR_SCREEN + CURSOR_HOME);
  }

  function onData(chunk: Buffer | string): void {
    const name = keyName(String(chunk));
    if (name === INTERRUPT_KEY) {
      leave();
      onInterrupt();
      return;
    }
    if (name === undefined || !isReportKey(name)) return;
    const next = handleKey(state, stages, name, reportBodyHeight(rows()));
    if (next === "close") {
      leave();
      onClose();
      return;
    }
    state = next;
    draw(CURSOR_HOME);
  }

  function leave(): void {
    input.off("data", onData);
    output.off("resize", onResize);
    output.write(LEAVE_SCREEN + SHOW_CURSOR);
  }

  function columns(): number {
    return output.columns && output.columns > 0 ? output.columns : DEFAULT_COLUMNS;
  }

  function rows(): number {
    return output.rows && output.rows > 0 ? output.rows : DEFAULT_ROWS;
  }
}

function isReportKey(name: string): name is ReportKey {
  return (REPORT_KEYS as readonly string[]).includes(name);
}
