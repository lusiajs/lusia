import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { watchFolder, type Watcher } from "#cli/dev/watch.ts";

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
