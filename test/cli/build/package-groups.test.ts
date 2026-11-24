import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { groupModules, packageName } from "#cli/build/package-groups.ts";

const ROOT = "/app";

describe("packageName", () => {
  test("uses the package folder under node_modules", () => {
    expect(packageName("/app/node_modules/lib/dist/index.js", ROOT)).toBe("lib");
  });

  test("keeps the scope for scoped packages", () => {
    expect(packageName("/app/node_modules/@codemirror/view/dist/index.js", ROOT)).toBe(
      "@codemirror/view",
    );
  });

  test("uses the innermost node_modules for nested packages", () => {
    expect(packageName("/app/node_modules/a/node_modules/b/index.js", ROOT)).toBe("b");
  });

  test("is undefined for app files, even when the app has a package.json", () => {
    expect(packageName("/app/src/Card.lusia", ROOT)).toBeUndefined();
  });

  test("names a shim module by its package", () => {
    expect(packageName("/work/lusia-shim:lusiajs/internal", ROOT)).toBe("lusiajs");
    expect(packageName("/work/lusia-shim:@scope/kit/extra", ROOT)).toBe("@scope/kit");
  });
});

describe("packageName outside the app folder", () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "lusia-packages-"));
    await mkdir(join(dir, "linked", "src", "cli"), { recursive: true });
    await writeFile(join(dir, "linked", "package.json"), JSON.stringify({ name: "linked-lib" }));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  test("a linked package is named by the nearest package.json", () => {
    expect(packageName(join(dir, "linked", "src", "cli", "x.js"), ROOT)).toBe("linked-lib");
  });

  test("a file outside the app with no package.json and no node_modules is an app file", () => {
    expect(packageName(join(dir, "loose.js"), ROOT)).toBeUndefined();
  });
});

describe("groupModules", () => {
  test("sums packages by name, largest first, and keeps app files apart", () => {
    const groups = groupModules(
      [
        { path: "/app/node_modules/small/a.js", bytes: 10 },
        { path: "/app/node_modules/@codemirror/view/a.js", bytes: 300 },
        { path: "/app/node_modules/@codemirror/view/b.js", bytes: 200 },
        { path: "/app/src/Small.lusia", bytes: 5 },
        { path: "/app/src/Big.lusia", bytes: 50 },
      ],
      ROOT,
    );
    expect(groups.packages).toEqual([
      { name: "@codemirror/view", files: 2, bytes: 500 },
      { name: "small", files: 1, bytes: 10 },
    ]);
    expect(groups.app.map((module) => module.path)).toEqual([
      "/app/src/Big.lusia",
      "/app/src/Small.lusia",
    ]);
  });

  test("a shim and a shim-named module group under one package", () => {
    const groups = groupModules(
      [
        { path: "/work/lusia-shim:lusiajs", bytes: 100 },
        { path: "/work/lusia-shim:lusiajs/internal", bytes: 50 },
      ],
      ROOT,
    );
    expect(groups.packages).toEqual([{ name: "lusiajs", files: 2, bytes: 150 }]);
  });
});
