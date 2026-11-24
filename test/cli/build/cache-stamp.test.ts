import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, stat, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildStamp, cacheStamp, isSourceInstall, newestMtime } from "#cli/build/cache-stamp.ts";
import { version } from "../../../package.json" with { type: "json" };

describe("isSourceInstall", () => {
  test("a lusia checkout is source", () => {
    expect(isSourceInstall("/home/me/Project/lusia")).toBe(true);
  });

  test("a lusia installed into node_modules is not source", () => {
    expect(isSourceInstall("/home/me/app/node_modules/lusiajs")).toBe(false);
  });
});

describe("buildStamp", () => {
  test("an installed lusia is stamped by its version only", () => {
    expect(buildStamp("0.1.0", undefined)).toBe("0.1.0");
  });

  test("a source lusia adds the newest source time, so a code edit changes the stamp", () => {
    expect(buildStamp("0.1.0", 1000)).not.toBe(buildStamp("0.1.0", 2000));
  });
});

describe("newestMtime", () => {
  test("returns the newest time among nested files and folders", async () => {
    const dir = await mkdtemp(join(tmpdir(), "lusia-stamp-"));
    await mkdir(join(dir, "nested"));
    const old = join(dir, "old.ts");
    const newest = join(dir, "nested", "new.ts");
    await writeFile(old, "");
    await writeFile(newest, "");
    await utimes(old, 1_000_000, 1_000_000);
    await utimes(newest, 2_000_000, 2_000_000);
    await utimes(join(dir, "nested"), 1_000_000, 1_000_000);
    await utimes(dir, 1_000_000, 1_000_000);
    expect(await newestMtime(dir)).toBe((await stat(newest)).mtimeMs);
    await rm(dir, { recursive: true, force: true });
  });
});

describe("cacheStamp", () => {
  test("starts with the lusia version", async () => {
    expect((await cacheStamp()).startsWith(version)).toBe(true);
  });
});
