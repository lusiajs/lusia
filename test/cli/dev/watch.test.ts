import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isIgnored, sourceFile, watchFolder, type Watcher } from "#cli/dev/watch.ts";

let dir: string;
let watcher: Watcher | undefined;

afterEach(async () => {
  watcher?.close();
  watcher = undefined;
  if (dir) await rm(dir, { recursive: true, force: true });
});

describe("watchFolder", () => {
  test("files changed close together arrive in one batch, after the debounce", async () => {
    dir = await mkdtemp(join(tmpdir(), "lusia-watch-"));
    const batches: string[][] = [];
    const waits: number[] = [];
    watcher = watchFolder(dir, (files, waitMs) => {
      batches.push(files);
      waits.push(waitMs);
    });
    await writeFile(join(dir, "a.lusia"), "a");
    await writeFile(join(dir, "b.scss"), "b");

    const deadline = Date.now() + 2000;
    while (batches.length === 0 && Date.now() < deadline) await Bun.sleep(5);
    await Bun.sleep(50);
    expect(batches).toHaveLength(1);
    expect(batches[0]!.sort()).toEqual(["a.lusia", "b.scss"]);
    expect(waits[0]).toBeGreaterThanOrEqual(0);
  });
});

describe("sourceFile", () => {
  test("maps an editor temp file to the file it saves", () => {
    expect(sourceFile("src/Hero.lusia.tmp.4242.9f8e7d")).toBe("src/Hero.lusia");
    expect(sourceFile("src/Hero.lusia")).toBe("src/Hero.lusia");
  });
});

describe("isIgnored", () => {
  test("skips editor backup and swap files", () => {
    expect(isIgnored("src/Hero.lusia~")).toBe(true);
    expect(isIgnored("src/.Hero.lusia.swp")).toBe(true);
    expect(isIgnored("src/Hero.lusia.swx")).toBe(true);
    expect(isIgnored("4913")).toBe(true);
  });

  test("skips the build output folder and dot or node_modules folders", () => {
    expect(isIgnored("dist/index.html")).toBe(true);
    expect(isIgnored("node_modules/lusiajs/index.ts")).toBe(true);
    expect(isIgnored(".git/HEAD")).toBe(true);
  });

  test("keeps app files, including a dist folder deeper in the app", () => {
    expect(isIgnored("src/Hero.lusia")).toBe(false);
    expect(isIgnored("public/dist/logo.svg")).toBe(false);
  });
});
