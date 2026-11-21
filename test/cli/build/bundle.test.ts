import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { bundleApp } from "#cli/build/bundle.ts";
import { runBuild } from "#cli/build/build.ts";
import { buildDev } from "#cli/build/dev-build.ts";

const REPO = new URL("../../../", import.meta.url).pathname;
const LAZY_MARKER = "lazy-chunk-marker-7f3";
const SCRIPT = /\.js$/;

let app: string;

beforeAll(async () => {
  app = await mkdtemp(join(tmpdir(), "lusia-bundle-"));
  await mkdir(join(app, "node_modules"));
  await symlink(REPO, join(app, "node_modules", "lusia"), "dir");
  await writeFile(
    join(app, "index.html"),
    '<!doctype html><html><body><script type="module" src="./main.ts"></script></body></html>\n',
  );
  await writeFile(join(app, "main.ts"), 'import("./lazy.ts").then((m) => m.run());\n');
  await writeFile(join(app, "lazy.ts"), `export function run() { return "${LAZY_MARKER}"; }\n`);
});

afterAll(async () => {
  await rm(app, { recursive: true, force: true });
});

describe("lazy chunks", () => {
  const SHARED_MARKER = "shared-chunk-marker-2c9";

  test("each lazy module is its own chunk, and a shared module is in one chunk only", async () => {
    const shared = await mkdtemp(join(tmpdir(), "lusia-shared-"));
    await mkdir(join(shared, "node_modules"));
    await symlink(REPO, join(shared, "node_modules", "lusia"), "dir");
    await writeFile(
      join(shared, "index.html"),
      '<!doctype html><html><body><script type="module" src="./main.ts"></script></body></html>\n',
    );
    await writeFile(
      join(shared, "main.ts"),
      'import("./first.ts").then((m) => m.run());\nimport("./second.ts").then((m) => m.run());\n',
    );
    await writeFile(
      join(shared, "first.ts"),
      'import { hi } from "./shared.ts";\nexport const run = () => hi("first");\n',
    );
    await writeFile(
      join(shared, "second.ts"),
      'import { hi } from "./shared.ts";\nexport const run = () => hi("second");\n',
    );
    await writeFile(
      join(shared, "shared.ts"),
      `export const hi = (name: string) => "${SHARED_MARKER}" + name;\n`,
    );

    const result = await bundleApp({ dir: shared, minify: false, dev: false });
    expect(result.success).toBe(true);
    const texts = await Promise.all(
      result.outputs.filter((output) => SCRIPT.test(output.path)).map((output) => output.text()),
    );
    expect(texts.filter((text) => text.includes(SHARED_MARKER))).toHaveLength(1);
    expect(texts.filter((text) => text.includes('"first"'))).toHaveLength(1);
    expect(texts.filter((text) => text.includes('"second"'))).toHaveLength(1);
    await rm(shared, { recursive: true, force: true });
  });
});

describe("splitting", () => {
  test("a dynamic import becomes a separate chunk file", async () => {
    const result = await bundleApp({ dir: app, minify: false, dev: false });
    expect(result.success).toBe(true);
    const scripts = result.outputs.filter((output) => SCRIPT.test(output.path));
    expect(scripts).toHaveLength(2);
    const withLazy = [];
    for (const script of scripts)
      if ((await script.text()).includes(LAZY_MARKER)) withLazy.push(script);
    expect(withLazy).toHaveLength(1);
  });

  test("lusia build writes the lazy chunk next to the entry", async () => {
    const outdir = await mkdtemp(join(tmpdir(), "lusia-bundle-out-"));
    expect(
      await runBuild({
        dir: app,
        outdir,
        minify: true,
        quiet: true,
        lazy: { mode: "smart", prefetch: "idle" },
      }),
    ).toBe(0);
    const files = await readdir(outdir);
    const scripts = files.filter((file) => SCRIPT.test(file));
    expect(scripts).toHaveLength(2);
    const texts = await Promise.all(scripts.map((file) => readFile(join(outdir, file), "utf8")));
    expect(texts.filter((text) => text.includes(LAZY_MARKER))).toHaveLength(1);
    await rm(outdir, { recursive: true, force: true });
  });

  test("dev builds serve the lazy chunk as its own asset", async () => {
    const result = await buildDev(app, { mode: "smart", prefetch: "idle" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const scripts = [...result.assets.entries()].filter(
      ([key]) => SCRIPT.test(key) && !key.startsWith("__lusia/"),
    );
    expect(scripts).toHaveLength(2);
    const texts = await Promise.all(scripts.map(([, blob]) => blob.text()));
    expect(texts.filter((text) => text.includes(LAZY_MARKER))).toHaveLength(1);
  });
});
