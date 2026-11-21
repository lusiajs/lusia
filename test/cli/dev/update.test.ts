import { describe, expect, test } from "bun:test";
import type { ModuleUpdate } from "#bun-plugin/update.ts";
import { chooseUpdate, describeUpdate, RELOAD } from "#cli/dev/update.ts";

const STYLE: ModuleUpdate = { path: "/app/src/Card.lusia", kind: "style", id: "abc", css: ".a{}" };
const CODE: ModuleUpdate = { path: "/app/src/Card.lusia", kind: "code" };

describe("chooseUpdate", () => {
  test("a style-only change of .lusia or .scss files swaps css", () => {
    expect(chooseUpdate(["src/Card.lusia"], [STYLE])).toEqual({
      kind: "styles",
      styles: [{ id: "abc", css: ".a{}" }],
    });
    expect(chooseUpdate(["src/_tokens.scss"], [STYLE])).toEqual({
      kind: "styles",
      styles: [{ id: "abc", css: ".a{}" }],
    });
  });

  test("a script or markup change hot swaps the component, with its style change if any", () => {
    expect(chooseUpdate(["src/Card.lusia"], [CODE])).toEqual({
      kind: "hot",
      paths: ["/app/src/Card.lusia"],
      styles: [],
    });
    expect(chooseUpdate(["src/Card.lusia"], [STYLE, CODE])).toEqual({
      kind: "hot",
      paths: ["/app/src/Card.lusia"],
      styles: [{ id: "abc", css: ".a{}" }],
    });
  });

  test("a changed .ts or other file reloads, even when only styles changed in the build", () => {
    expect(chooseUpdate(["src/topbar.ts"], [STYLE])).toBe(RELOAD);
    expect(chooseUpdate(["src/Card.lusia", "src/topbar.ts"], [STYLE])).toBe(RELOAD);
    expect(chooseUpdate(["index.html"], [])).toBe(RELOAD);
  });

  test("no changed files reloads", () => {
    expect(chooseUpdate([], [])).toBe(RELOAD);
  });

  test("labels the update for the log", () => {
    expect(describeUpdate(RELOAD)).toBe("reload");
    expect(describeUpdate({ kind: "styles", styles: [] })).toBe("css swap");
  });
});
