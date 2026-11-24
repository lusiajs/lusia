import { describe, expect, test } from "bun:test";
import { createKeyActions } from "#cli/dev/key-actions.ts";
import { formatShortcutGrid } from "#cli/dev/shortcuts.ts";
import { createUpdatePrinter } from "#cli/dev/update-printer.ts";
import type { Rebuild } from "#cli/dev/rebuild.ts";

const CLEAR_SCREEN = "\x1b[2J\x1b[H";
const URLS = [{ label: "Local", url: "http://localhost:3000/" }];

function setup() {
  const written: string[] = [];
  const printer = createUpdatePrinter((text) => written.push(text), {
    color: false,
    showTiming: false,
  });
  const output = {
    write: (text: string) => {
      written.push(text);
      return true;
    },
  };
  const actions = createKeyActions({
    urls: URLS,
    localUrl: "http://localhost:3000/",
    startup: { boot: 0, types: 0, sass: 0, compile: 0, bundle: 0, server: 0, total: 0 },
    color: false,
    printer,
    rebuild: {} as Rebuild,
    onInterrupt: () => {},
    keys: { pause: () => {}, resume: () => {} },
    output,
    columns: 100,
  });
  return { written, actions };
}

describe("createKeyActions", () => {
  test("c clears the terminal, then prints the URLs and the key grid", () => {
    const { written, actions } = setup();
    actions.clear();
    expect(written).toEqual([
      CLEAR_SCREEN,
      "   ➜  Local    http://localhost:3000/",
      formatShortcutGrid(100, false),
    ]);
  });

  test("u prints only the URLs", () => {
    const { written, actions } = setup();
    actions.urls();
    expect(written).toEqual(["   ➜  Local    http://localhost:3000/"]);
  });
});
