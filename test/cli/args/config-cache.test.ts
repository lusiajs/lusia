import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseCommand } from "#cli/args/args.ts";
import { parseConfig, readConfig } from "#cli/args/config.ts";

const ALL_ON = { styles: true, modules: true, packages: true };
const ALL_OFF = { styles: false, modules: false, packages: false };

function appWith(json: string): string {
  const dir = mkdtempSync(join(tmpdir(), "lusia-cache-"));
  writeFileSync(join(dir, "lusia.config.json"), json);
  return dir;
}

describe("cache config", () => {
  test("an object sets each cache on its own", () => {
    expect(parseConfig('{ "cache": { "packages": false } }').cache).toEqual({
      packages: false,
    });
  });

  test("a boolean is refused, like any other section that needs an object", () => {
    expect(() => parseConfig('{ "cache": false }')).toThrow('"cache" must be an object');
    expect(() => parseConfig('{ "cache": true }')).toThrow('"cache" must be an object');
  });

  test("an unknown cache name is refused, with the allowed names", () => {
    expect(() => parseConfig('{ "cache": { "module": false } }')).toThrow(
      'unknown key "module" in "cache", allowed: styles, modules, packages',
    );
  });

  test("a cache flag that is not true or false is refused, and names the key", () => {
    expect(() => parseConfig('{ "cache": { "styles": "yes" } }')).toThrow(
      '"cache.styles" must be true or false',
    );
  });

  test("build and dev read the config cache setting", async () => {
    const dir = appWith('{ "cache": { "modules": false } }');
    expect((await readConfig(dir)).cache).toEqual({ modules: false });
    expect(await parseCommand(["build", dir], {})).toMatchObject({
      cache: { ...ALL_ON, modules: false },
    });
    expect(await parseCommand(["dev", dir], {})).toMatchObject({
      cache: { ...ALL_ON, modules: false },
    });
  });

  test("--no-cache beats the config", async () => {
    const dir = appWith('{ "cache": { "styles": true } }');
    expect(await parseCommand(["build", dir, "--no-cache"], {})).toMatchObject({
      cache: ALL_OFF,
    });
    expect(await parseCommand(["dev", dir, "--no-cache"], {})).toMatchObject({
      cache: ALL_OFF,
    });
  });
});
