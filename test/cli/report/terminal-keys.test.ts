import { describe, expect, test } from "bun:test";
import { keyName } from "#cli/report/terminal-keys.ts";

describe("keyName", () => {
  test("maps arrow keys, paging and shift-tab escape sequences", () => {
    expect(keyName("\x1b[A")).toBe("up");
    expect(keyName("\x1b[B")).toBe("down");
    expect(keyName("\x1b[C")).toBe("right");
    expect(keyName("\x1b[D")).toBe("left");
    expect(keyName("\x1b[5~")).toBe("pageup");
    expect(keyName("\x1b[6~")).toBe("pagedown");
    expect(keyName("\x1b[Z")).toBe("shift-tab");
  });

  test("maps tab, enter, a lone escape and ctrl-c", () => {
    expect(keyName("\t")).toBe("tab");
    expect(keyName("\r")).toBe("enter");
    expect(keyName("\x1b")).toBe("escape");
    expect(keyName("\x03")).toBe("ctrl-c");
  });

  test("maps a plain lowercase letter to itself", () => {
    expect(keyName("s")).toBe("s");
    expect(keyName("j")).toBe("j");
  });

  test("returns undefined for keys the report does not use", () => {
    expect(keyName("X")).toBeUndefined();
    expect(keyName("1")).toBeUndefined();
    expect(keyName("\x1b[1;5C")).toBeUndefined();
    expect(keyName("")).toBeUndefined();
  });
});
