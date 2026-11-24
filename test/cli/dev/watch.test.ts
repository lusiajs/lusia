import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isIgnored, sourceFile, watchFolder, type Watcher } from "#cli/dev/watch.ts";
import { readIgnore } from "#cli/utils/ignore.ts";

const NO_GITIGNORE = readIgnore(join(tmpdir(), "lusia-no-gitignore"));
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

  test("changes in folders the .gitignore lists are not reported", async () => {
    dir = await mkdtemp(join(tmpdir(), "lusia-watch-"));
    await writeFile(join(dir, ".gitignore"), "drafts/\n");
    await mkdir(join(dir, "drafts"));
    const batches: string[][] = [];
    watcher = watchFolder(dir, (files) => batches.push(files));
    await writeFile(join(dir, "drafts", "Note.lusia"), "a");
    await writeFile(join(dir, "Hero.lusia"), "b");

    const deadline = Date.now() + 2000;
    while (batches.length === 0 && Date.now() < deadline) await Bun.sleep(5);
    await Bun.sleep(50);
    expect(batches).toHaveLength(1);
    expect(batches[0]).toEqual(["Hero.lusia"]);
  });
});

describe("sourceFile", () => {
  test("maps an editor temp file to the file it saves", () => {
    expect(sourceFile("src/Hero.lusia.tmp.4242.9f8e7d")).toBe("src/Hero.lusia");
    expect(sourceFile("src/Hero.lusia")).toBe("src/Hero.lusia");
  });
});

describe("isIgnored without .gitignore", () => {
  test("skips editor backup and swap files", () => {
    expect(isIgnored(NO_GITIGNORE, "src/Hero.lusia~")).toBe(true);
    expect(isIgnored(NO_GITIGNORE, "src/.Hero.lusia.swp")).toBe(true);
    expect(isIgnored(NO_GITIGNORE, "src/Hero.lusia.swx")).toBe(true);
    expect(isIgnored(NO_GITIGNORE, "4913")).toBe(true);
  });

  test("skips the build output folder and dot folders", () => {
    expect(isIgnored(NO_GITIGNORE, "dist/index.html")).toBe(true);
    expect(isIgnored(NO_GITIGNORE, ".git/HEAD")).toBe(true);
    expect(isIgnored(NO_GITIGNORE, ".storybook/main.lusia")).toBe(true);
  });

  test("keeps app files, including a dist folder deeper in the app", () => {
    expect(isIgnored(NO_GITIGNORE, "src/Hero.lusia")).toBe(false);
    expect(isIgnored(NO_GITIGNORE, "public/dist/logo.svg")).toBe(false);
  });
});

describe("isIgnored with .gitignore", () => {
  test("skips the paths the .gitignore lists", async () => {
    const rules = readIgnore(await mkGitignore("drafts/\ngenerated.lusia\n"));
    expect(isIgnored(rules, "drafts/Note.lusia")).toBe(true);
    expect(isIgnored(rules, "src/generated.lusia")).toBe(true);
    expect(isIgnored(rules, "src/Hero.lusia")).toBe(false);
  });

  test("does not skip dot folders the .gitignore does not list", async () => {
    const rules = readIgnore(await mkGitignore("dist\n"));
    expect(isIgnored(rules, ".storybook/main.lusia")).toBe(false);
  });

  test("still skips editor junk", async () => {
    const rules = readIgnore(await mkGitignore(""));
    expect(isIgnored(rules, "src/Hero.lusia~")).toBe(true);
  });
});

async function mkGitignore(text: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "lusia-watch-ignore-"));
  await writeFile(join(dir, ".gitignore"), text);
  return dir;
}
