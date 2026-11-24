import { describe, expect, test } from "bun:test";
import { buildStages } from "#cli/report/report-model.ts";
import {
  openReportScreen,
  type ScreenInput,
  type ScreenOutput,
} from "#cli/report/report-screen.ts";
import { fakeReport, fakeStartup } from "./fake-report.ts";

type DataListener = (chunk: Buffer | string) => void;

const stages = buildStages(fakeReport, fakeStartup);

/** A terminal stand-in: `press` sends a key chunk to the listeners, `written` is everything drawn. */
function fakeTerminal() {
  const dataListeners = new Set<DataListener>();
  const resizeListeners = new Set<() => void>();
  const written: string[] = [];
  const input: ScreenInput = {
    on: (_event, listener) => dataListeners.add(listener),
    off: (_event, listener) => dataListeners.delete(listener),
  };
  const output: ScreenOutput = {
    columns: 80,
    rows: 20,
    write: (text) => written.push(text),
    on: (_event, listener) => resizeListeners.add(listener),
    off: (_event, listener) => resizeListeners.delete(listener),
  };
  return {
    input,
    output,
    written,
    press: (key: string) => [...dataListeners].forEach((listener) => listener(key)),
    resize: () => [...resizeListeners].forEach((listener) => listener()),
    listenerCount: () => dataListeners.size + resizeListeners.size,
  };
}

function open(terminal: ReturnType<typeof fakeTerminal>) {
  const calls: string[] = [];
  openReportScreen({
    stages,
    input: terminal.input,
    output: terminal.output,
    color: false,
    onClose: () => calls.push("close"),
    onInterrupt: () => calls.push("interrupt"),
  });
  return calls;
}

describe("openReportScreen", () => {
  test("enters the alternate screen, hides the cursor and draws the report", () => {
    const terminal = fakeTerminal();
    open(terminal);
    expect(terminal.written[0]).toBe("\x1b[?1049h\x1b[?25l");
    expect(terminal.written.at(1)?.startsWith("\x1b[H")).toBe(true);
    expect(terminal.written.at(1)).toContain("lusia build report");
  });

  test("redraws the frame when a key moves the selection", () => {
    const terminal = fakeTerminal();
    open(terminal);
    const before = terminal.written.length;
    terminal.press("\x1b[B");
    expect(terminal.written.length).toBe(before + 1);
    expect(terminal.written[before]).toContain("lusia build report");
  });

  test("clears and redraws on resize, at the new size", () => {
    const terminal = fakeTerminal();
    open(terminal);
    terminal.output.columns = 60;
    terminal.resize();
    const frame = terminal.written.at(-1) ?? "";
    expect(frame.startsWith("\x1b[2J\x1b[H")).toBe(true);
    const lines = frame.slice("\x1b[2J\x1b[H".length).split("\n");
    expect(lines).toHaveLength(20);
    for (const line of lines) expect(line).toHaveLength(60);
  });

  test("esc leaves the alternate screen, shows the cursor and calls onClose", () => {
    const terminal = fakeTerminal();
    const calls = open(terminal);
    terminal.press("\x1b");
    expect(terminal.written[terminal.written.length - 1]).toBe("\x1b[?1049l\x1b[?25h");
    expect(calls).toEqual(["close"]);
    expect(terminal.listenerCount()).toBe(0);
  });

  test("d also closes the screen", () => {
    const terminal = fakeTerminal();
    const calls = open(terminal);
    terminal.press("d");
    expect(calls).toEqual(["close"]);
  });

  test("ignores keys the report does not use and draws nothing for them", () => {
    const terminal = fakeTerminal();
    const calls = open(terminal);
    const before = terminal.written.length;
    terminal.press("x");
    expect(terminal.written.length).toBe(before);
    expect(calls).toEqual([]);
  });

  test("ctrl-c restores the terminal first, then calls onInterrupt", () => {
    const terminal = fakeTerminal();
    const calls: string[] = [];
    openReportScreen({
      stages,
      input: terminal.input,
      output: {
        ...terminal.output,
        write: (text) => {
          terminal.written.push(text);
          calls.push(`write ${text === "\x1b[?1049l\x1b[?25h" ? "restore" : "draw"}`);
        },
      },
      color: false,
      onClose: () => calls.push("close"),
      onInterrupt: () => calls.push("interrupt"),
    });
    terminal.press("\x03");
    expect(calls.slice(-2)).toEqual(["write restore", "interrupt"]);
    expect(terminal.listenerCount()).toBe(0);
  });
});
