import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, stat, utimes } from "node:fs/promises";
import { join, resolve } from "node:path";
import { screenTypesSource, writeScreenTypes } from "#cli/types/screen-types.ts";

// Fixtures live in the worktree's .agent folder (gitignored), not in /tmp.
const AGENT_DIR = resolve(import.meta.dir, "../../../.agent");

let dir: string | undefined;

afterEach(async () => {
  if (dir) await rm(dir, { recursive: true, force: true });
  dir = undefined;
});

async function appFolder(): Promise<string> {
  await mkdir(AGENT_DIR, { recursive: true });
  dir = await mkdtemp(join(AGENT_DIR, "screen-types-"));
  return dir;
}

describe("screenTypesSource", () => {
  test("declares each configured screen on ProjectScreens", () => {
    const source = screenTypesSource({ MOBILE: 0, WIDE: 800 });
    expect(source).toContain('declare module "lusiajs"');
    expect(source).toContain("interface ProjectScreens {\n    MOBILE: true;\n    WIDE: true;\n  }");
  });

  test("has no keys when screens is not set", () => {
    expect(screenTypesSource(undefined)).toContain("interface ProjectScreens {\n  }");
  });
});

describe("writeScreenTypes", () => {
  test("writes .lusia/screens.d.ts with the configured keys", async () => {
    const root = await appFolder();
    await writeScreenTypes(root, { MOBILE: 0, WIDE: 800 });
    const text = await readFile(join(root, ".lusia", "screens.d.ts"), "utf8");
    expect(text).toBe(screenTypesSource({ MOBILE: 0, WIDE: 800 }));
  });

  test("does not rewrite the file when the content is the same", async () => {
    const root = await appFolder();
    const file = join(root, ".lusia", "screens.d.ts");
    await writeScreenTypes(root, { MOBILE: 0 });
    await utimes(file, new Date(0), new Date(0));
    await writeScreenTypes(root, { MOBILE: 0 });
    expect((await stat(file)).mtimeMs).toBe(0);
  });

  test("rewrites the file when the screens change", async () => {
    const root = await appFolder();
    await writeScreenTypes(root, { MOBILE: 0 });
    await writeScreenTypes(root, { WIDE: 0 });
    const text = await readFile(join(root, ".lusia", "screens.d.ts"), "utf8");
    expect(text).toContain("WIDE: true;");
    expect(text).not.toContain("MOBILE");
  });
});
