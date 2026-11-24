import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { CACHE_FOLDER, cacheFolder } from "#cli/build/cache-file.ts";
import { compileCachePath } from "#cli/build/compile-disk-cache.ts";
import { PACKAGE_DIR } from "#cli/build/package-manifest.ts";
import { styleCachePath } from "#cli/build/sass-disk-cache.ts";

describe("cache folder", () => {
  test("every app cache lives under .lusia/cache", () => {
    const root = "/app";
    expect(CACHE_FOLDER).toBe(join(".lusia", "cache"));
    expect(cacheFolder(root)).toBe(join(root, ".lusia", "cache"));
    expect(styleCachePath(root)).toBe(join(root, ".lusia", "cache", "styles.json"));
    expect(compileCachePath(root)).toBe(join(root, ".lusia", "cache", "modules.json"));
    expect(PACKAGE_DIR).toBe(join(".lusia", "cache", "packages"));
  });
});
