import { describe, expect, test } from "bun:test";
import { createBuildCache } from "#cli/build/build-cache.ts";
import type { PackageCache } from "#cli/build/package-cache.ts";

function fakePackages(externals: string[]): PackageCache {
  return {
    plugins: () => [],
    externals: () => externals,
    importMap: () =>
      Object.fromEntries(externals.map((name) => [name, `/__lusia/packages/${name}.js`])),
    assets: () => [],
    record: () => undefined,
    bundleMissing: async () => false,
  };
}

describe("createBuildCache", () => {
  test("passes the package methods through", () => {
    const cache = createBuildCache(fakePackages(["sass"]), []);
    expect(cache.externals()).toEqual(["sass"]);
    expect(cache.importMap()).toEqual({ sass: "/__lusia/packages/sass.js" });
  });

  test("save runs every saver", async () => {
    const saved: string[] = [];
    const cache = createBuildCache(fakePackages([]), [
      async () => void saved.push("styles"),
      async () => void saved.push("modules"),
    ]);
    await cache.save();
    expect(saved.sort()).toEqual(["modules", "styles"]);
  });

  test("save with no savers does nothing", async () => {
    await expect(createBuildCache(fakePackages([]), []).save()).resolves.toBeUndefined();
  });
});
