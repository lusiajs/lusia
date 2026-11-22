import { describe, expect, test } from "bun:test";
import { screenPrelude, screensKey } from "#bun-plugin/screen-prelude.ts";
import { compileKey } from "#bun-plugin/cache.ts";

describe("screenPrelude", () => {
  test("is empty when the config sets no screens", () => {
    expect(screenPrelude(undefined)).toBe("");
  });

  test("sets the build's screen sizes in the module", () => {
    const code = screenPrelude({ SMALL: 0, WIDE: 1400 });
    expect(code).toContain('import { setScreens } from "lusiajs/internal";');
    expect(code).toContain('setScreens({"SMALL":0,"WIDE":1400});');
  });
});

describe("compile key with screens", () => {
  test("a change to the screens gives a new key", () => {
    const before = compileKey("lazy", "anim", screensKey(undefined));
    const after = compileKey("lazy", "anim", screensKey({ PHONE: 0 }));
    expect(after).not.toBe(before);
  });
});
