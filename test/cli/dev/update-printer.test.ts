import { describe, expect, test } from "bun:test";
import { createUpdatePrinter } from "#cli/dev/update-printer.ts";

const TIME = new Date(2026, 0, 1, 15, 9, 46);
const OPTIONS = { color: false, showTiming: true };

describe("createUpdatePrinter", () => {
  test("prints an update once the browser reports ready, with the browser time", () => {
    const written: string[] = [];
    const printer = createUpdatePrinter((text) => written.push(text), OPTIONS);
    printer.show({ time: TIME, kind: "hot", files: ["a.lusia"], steps: { total: 10 } });
    expect(written).toEqual([]);
    printer.ready(75);
    expect(written).toEqual(["15:09:46  ● hot     a.lusia\n          ` total 10 ms | browser 75"]);
  });

  test("a ready report with no pending update prints nothing", () => {
    const written: string[] = [];
    createUpdatePrinter((text) => written.push(text), OPTIONS).ready(75);
    expect(written).toEqual([]);
  });

  test("while held, updates and prints are queued and written on release, in order", () => {
    const written: string[] = [];
    const printer = createUpdatePrinter((text) => written.push(text), OPTIONS);
    printer.hold();
    printer.show({ time: TIME, kind: "hot", files: ["a.lusia"], steps: { total: 10 } });
    printer.ready(75);
    printer.print("held line");
    expect(written).toEqual([]);
    printer.release();
    expect(written).toEqual([
      "15:09:46  ● hot     a.lusia\n          ` total 10 ms | browser 75",
      "held line",
    ]);
  });

  test("after release, output is written at once again", () => {
    const written: string[] = [];
    const printer = createUpdatePrinter((text) => written.push(text), OPTIONS);
    printer.hold();
    printer.release();
    printer.print("now");
    expect(written).toEqual(["now"]);
  });
});
