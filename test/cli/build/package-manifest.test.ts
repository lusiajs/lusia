import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  missingPackages,
  packageKey,
  PACKAGE_DIR,
  readPackageManifest,
  writePackageManifest,
  type PackageManifest,
} from "#cli/build/package-manifest.ts";

let root: string;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "lusia-manifest-"));
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("packageKey", () => {
  test("no lockfile means no key, so the packages are not cached", async () => {
    const bare = await mkdtemp(join(tmpdir(), "lusia-nolock-"));
    expect(await packageKey(bare)).toBeUndefined();
    await rm(bare, { recursive: true, force: true });
  });

  test("the key changes when the lockfile changes", async () => {
    const app = await mkdtemp(join(root, "app-"));
    await writeFile(join(app, "bun.lock"), "lock v1");
    const first = await packageKey(app);
    await writeFile(join(app, "bun.lock"), "lock v2");
    expect(await packageKey(app)).not.toBe(first);
  });

  test("the same lockfile gives the same key", async () => {
    const app = await mkdtemp(join(root, "same-"));
    await writeFile(join(app, "bun.lock"), "lock");
    expect(await packageKey(app)).toBe(await packageKey(app));
  });

  test("a package-lock.json is used when there is no bun.lock", async () => {
    const app = await mkdtemp(join(root, "npm-"));
    await writeFile(join(app, "package-lock.json"), "{}");
    expect(await packageKey(app)).toBeDefined();
  });
});

describe("readPackageManifest", () => {
  test("a manifest for another key is ignored", async () => {
    const app = await mkdtemp(join(root, "stale-"));
    await mkdir(join(app, PACKAGE_DIR), { recursive: true });
    const manifest: PackageManifest = { key: "old", entries: {}, files: [], modules: [] };
    await writePackageManifest(app, manifest);
    expect(await readPackageManifest(app, "new")).toBeUndefined();
    expect(await readPackageManifest(app, "old")).toEqual(manifest);
  });

  test("a manifest whose file was removed is ignored", async () => {
    const app = await mkdtemp(join(root, "gone-"));
    const manifest: PackageManifest = {
      key: "k",
      entries: { sass: { name: "sass.js", file: "/app/node_modules/sass/sass.js" } },
      files: [{ name: "sass.js", bytes: 3 }],
      modules: [],
    };
    await writePackageManifest(app, manifest);
    expect(await readPackageManifest(app, "k")).toBeUndefined();
  });
});

describe("missingPackages", () => {
  const manifest: PackageManifest = {
    key: "k",
    entries: {
      "@codemirror/view": { name: "codemirror__view.js", file: "/app/node_modules/x.js" },
    },
    files: [],
    modules: [],
  };

  test("lists the imported packages that the bundle lacks", () => {
    const found = new Map([
      ["@codemirror/view", "/app/node_modules/@codemirror/view/index.js"],
      ["sass", "/app/node_modules/sass/sass.js"],
    ]);
    expect(missingPackages(found, manifest)).toEqual(["sass"]);
  });

  test("with no bundle, every imported package is missing", () => {
    const found = new Map([["sass", "/app/node_modules/sass/sass.js"]]);
    expect(missingPackages(found, undefined)).toEqual(["sass"]);
  });

  test("nothing is missing when every import is in the bundle", () => {
    const found = new Map([["@codemirror/view", "/app/node_modules/@codemirror/view/index.js"]]);
    expect(missingPackages(found, manifest)).toEqual([]);
  });
});
