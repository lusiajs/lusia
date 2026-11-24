import { describe, expect, test } from "bun:test";
import { cacheOf } from "#cli/args/settings.ts";

const ALL_ON = { styles: true, modules: true, packages: true };
const ALL_OFF = { styles: false, modules: false, packages: false };

describe("cacheOf", () => {
  test("everything is on by default", () => {
    expect(cacheOf({}, false)).toEqual(ALL_ON);
  });

  test("--no-cache turns everything off, even when the config turns caches on", () => {
    expect(cacheOf({}, true)).toEqual(ALL_OFF);
    expect(cacheOf({ cache: { styles: true } }, true)).toEqual(ALL_OFF);
  });

  test("the config turns off only the caches it names", () => {
    expect(cacheOf({ cache: { modules: false } }, false)).toEqual({
      styles: true,
      modules: false,
      packages: true,
    });
  });

  test("returns a new object each time, so a caller cannot change the defaults", () => {
    const settings = cacheOf({}, false);
    settings.styles = false;
    expect(cacheOf({}, false)).toEqual(ALL_ON);
  });
});
