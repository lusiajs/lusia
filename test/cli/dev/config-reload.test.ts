import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { readConfig } from "#cli/args/config.ts";
import { isConfigFile, readDevConfig } from "#cli/dev/config-reload.ts";

// Fixtures live in the worktree's .agent folder (gitignored), not in /tmp.
const AGENT_DIR = resolve(import.meta.dir, "../../../.agent");

let dir: string | undefined;

afterEach(async () => {
  if (dir) await rm(dir, { recursive: true, force: true });
  dir = undefined;
});

async function appFolder(): Promise<string> {
  await mkdir(AGENT_DIR, { recursive: true });
  dir = await mkdtemp(join(AGENT_DIR, "config-reload-"));
  return dir;
}

function durationConfig(duration: number): string {
  return `export default { animate: { duration: ${duration} } };\n`;
}

describe("isConfigFile", () => {
  test("true for the two config file names", () => {
    expect(isConfigFile("lusia.config.ts")).toBe(true);
    expect(isConfigFile("lusia.config.json")).toBe(true);
  });

  test("false for other files", () => {
    expect(isConfigFile("Greeting.lusia")).toBe(false);
    expect(isConfigFile("styles.scss")).toBe(false);
    expect(isConfigFile("lusia.config.js")).toBe(false);
  });
});

describe("readConfig for a TS file", () => {
  test("reads the new value after the file is edited", async () => {
    const app = await appFolder();
    const file = join(app, "lusia.config.ts");
    await writeFile(file, durationConfig(300));
    expect((await readConfig(app)).animate?.duration).toBe(300);

    await writeFile(file, durationConfig(500));
    expect((await readConfig(app)).animate?.duration).toBe(500);
  });
});

describe("readDevConfig", () => {
  test("returns the lazy and animate values of a valid config", async () => {
    const app = await appFolder();
    await writeFile(join(app, "lusia.config.ts"), durationConfig(250));

    const result = await readDevConfig(app);

    expect(result).toEqual({
      ok: true,
      config: {
        lazy: { mode: "smart", prefetch: "idle" },
        animate: { duration: 250 },
        routes: {},
      },
    });
  });

  test("uses the default lazy mode and no animate settings when the config is empty", async () => {
    const app = await appFolder();

    const result = await readDevConfig(app);

    expect(result).toEqual({
      ok: true,
      config: { lazy: { mode: "smart", prefetch: "idle" }, animate: {}, routes: {} },
    });
  });

  test("returns the error messages of an invalid config", async () => {
    const app = await appFolder();
    await writeFile(join(app, "lusia.config.ts"), "export default { minify: 'yes' };\n");

    const result = await readDevConfig(app);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]).toContain("lusia.config.ts");
    expect(result.messages[0]).toContain("must be true or false");
  });
});
