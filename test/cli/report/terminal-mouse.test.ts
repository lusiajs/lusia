import { describe, expect, test } from "bun:test";
import { parseMouse, parseMouseEvents } from "#cli/report/terminal-mouse.ts";

describe("parseMouse", () => {
  test("reads a left press and turns the 1-based cell into a 0-based position", () => {
    expect(parseMouse("\x1b[<0;10;5M")).toEqual({ kind: "press", x: 9, y: 4 });
  });

  test("reads a release", () => {
    expect(parseMouse("\x1b[<0;10;5m")).toEqual({ kind: "release", x: 9, y: 4 });
  });

  test("reads wheel up and wheel down", () => {
    expect(parseMouse("\x1b[<64;3;4M")).toEqual({ kind: "wheel-up", x: 2, y: 3 });
    expect(parseMouse("\x1b[<65;3;4M")).toEqual({ kind: "wheel-down", x: 2, y: 3 });
  });

  test("ignores right and middle presses, motion and other keys", () => {
    expect(parseMouse("\x1b[<2;3;4M")).toBeUndefined();
    expect(parseMouse("\x1b[<1;3;4M")).toBeUndefined();
    expect(parseMouse("\x1b[<32;3;4M")).toBeUndefined();
    expect(parseMouse("j")).toBeUndefined();
  });
});

describe("parseMouseEvents", () => {
  test("reads every sequence in one chunk, in order", () => {
    expect(parseMouseEvents("\x1b[<0;1;1M\x1b[<64;2;2M\x1b[<0;1;1m")).toEqual([
      { kind: "press", x: 0, y: 0 },
      { kind: "wheel-up", x: 1, y: 1 },
      { kind: "release", x: 0, y: 0 },
    ]);
  });

  test("returns an empty list for a chunk without mouse events", () => {
    expect(parseMouseEvents("\x1b[A")).toEqual([]);
  });
});
