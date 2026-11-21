import { afterAll, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { PluginBuilder } from "bun";
import { readConfig } from "#cli/args/config.ts";
import { lusia } from "#bun-plugin/index.ts";
import type { AnimateConfig } from "#runtime/animate/options/config.ts";

const DEFINE_CONFIG = new URL("../../src/config/index.ts", import.meta.url).pathname;
const CONFIG_FILE = "lusia.config.ts";
const APP_FILE = "App.lusia";
const IMPORT_LINE = 'import { animateConfigFromNames, setAnimateConfig } from "lusiajs/internal";';

const APP_SOURCE = `<script>
const label = "app";
</script>

<p animate={{ style: { 0: { opacity: 0 }, 1: { opacity: 1 } } }}>{label}</p>
`;

const GOOD_CONFIG = `import { defineConfig } from "${DEFINE_CONFIG}";

export default defineConfig({
  animate: { duration: 500, view: { amount: 0.5 }, in: "FADE_IN" },
});
`;

const BAD_CONFIG = `import { defineConfig } from "${DEFINE_CONFIG}";

export default defineConfig({ animate: { view: { amount: 1.5 } } });
`;

type LoadHandler = (args: { path: string }) => Promise<{ contents: string }>;

const dirs: string[] = [];

afterAll(async () => {
  await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
});

async function makeApp(config?: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "lusia-config-"));
  dirs.push(dir);
  await mkdir(dir, { recursive: true });
  if (config !== undefined) await writeFile(join(dir, CONFIG_FILE), config);
  await writeFile(join(dir, APP_FILE), APP_SOURCE);
  return dir;
}

/** Runs the plugin's .lusia loader the way the bundler does, with the given animate config. */
async function compileApp(file: string, animate?: AnimateConfig): Promise<string> {
  let loader: LoadHandler | undefined;
  const build = {
    onResolve() {},
    onLoad(options: { filter: RegExp; namespace?: string }, callback: LoadHandler) {
      if (options.namespace === undefined && options.filter.test(file)) loader = callback;
    },
  } as unknown as PluginBuilder;
  lusia({ animate }).setup(build);
  if (loader === undefined) throw new Error("the plugin has no .lusia loader");
  return (await loader({ path: file })).contents;
}

describe("lusia.config.ts animate defaults", () => {
  test("readConfig loads the animate values", async () => {
    const config = await readConfig(await makeApp(GOOD_CONFIG));
    expect(config.animate?.duration).toBe(500);
    expect(config.animate?.view?.amount).toBe(0.5);
  });

  test("the compiled module starts with the prelude and carries the config", async () => {
    const dir = await makeApp(GOOD_CONFIG);
    const config = await readConfig(dir);
    const code = await compileApp(join(dir, APP_FILE), config.animate);
    expect(code.slice(0, IMPORT_LINE.length)).toBe(IMPORT_LINE);
    expect(code).toContain("setAnimateConfig(animateConfigFromNames(");
    expect(code).toContain('"duration":500');
    expect(code).toContain('"amount":0.5');
    expect(code).toContain('"FADE_IN"');
  });

  test("a compiled module has no prelude without an animate config", async () => {
    const dir = await makeApp();
    const config = await readConfig(dir);
    const code = await compileApp(join(dir, APP_FILE), config.animate);
    expect(code).not.toContain("setAnimateConfig");
  });

  test("a bad value makes readConfig fail with the config file name", async () => {
    await expect(readConfig(await makeApp(BAD_CONFIG))).rejects.toThrow(CONFIG_FILE);
  });
});
