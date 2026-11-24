import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, symlink, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { storeModule, pruneModules, type CachedModule } from "#bun-plugin/cache.ts";
import type { ModuleUpdate } from "#bun-plugin/update.ts";
import { lusia } from "#bun-plugin/index.ts";
import { compile, hash } from "#compiler/index.ts";
import { stampFile } from "#compiler/utils/file-stamp.ts";
import type { Steps } from "#cli/build/timings.ts";
import { emptyReport } from "#cli/build/build-report.ts";
import type { AnimateConfig } from "#runtime/animate/options/config.ts";

const REPO = new URL("../../", import.meta.url).pathname;

let dir: string;
let card: string;

function cardSource(label = "card", styleRule = "color: tokens.$accent;"): string {
  return [
    "<script>",
    `const label = "${label}";`,
    "</script>",
    "",
    '<p class="card">card</p>',
    "",
    '<style lang="scss">',
    '@use "tokens";',
    `.card { ${styleRule} }`,
    "</style>",
    "",
  ].join("\n");
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "lusia-cache-"));
  await mkdir(join(dir, "node_modules"));
  await symlink(REPO, join(dir, "node_modules", "lusiajs"), "dir");
  await writeFile(join(dir, "entry.ts"), 'import "./Card.lusia";\n');
  await writeFile(join(dir, "_tokens.scss"), "$accent: red;\n");
  card = join(dir, "Card.lusia");
  await writeFile(card, cardSource());
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function build(animate?: AnimateConfig): Promise<{ steps: Steps; changes: ModuleUpdate[] }> {
  const steps: Steps = {};
  const changes: ModuleUpdate[] = [];
  const result = await Bun.build({
    entrypoints: [join(dir, "entry.ts")],
    plugins: [lusia({ dev: true, steps, animate, onUpdate: (update) => changes.push(update) })],
    throw: false,
  });
  if (!result.success) throw new Error(result.logs.map((log) => log.message).join("\n"));
  return { steps, changes };
}

describe("lusia plugin cache", () => {
  test("an unchanged file is a cache hit: nothing is compiled and nothing changed", async () => {
    await build();
    const second = await build();
    expect(second.steps.compile).toBeUndefined();
    expect(second.steps.sass).toBeUndefined();
    expect(second.changes).toEqual([]);
  });

  test("a Sass partial change recompiles the styles and reports a css change only", async () => {
    await build();
    await writeFile(join(dir, "_tokens.scss"), "$accent: blue;\n");
    const second = await build();
    expect(second.steps.sass).toBeDefined();
    expect(second.changes).toEqual([
      { path: card, kind: "style", id: hash(card), css: expect.stringContaining("color: blue;") },
    ]);
  });

  test("a style-only edit reports a css change with the component id", async () => {
    await build();
    await writeFile(card, cardSource("card", "color: green;"));
    const second = await build();
    expect(second.changes).toEqual([
      { path: card, kind: "style", id: hash(card), css: expect.stringContaining("color: green;") },
    ]);
  });

  test("a script change reports a code change, so the page reloads", async () => {
    await build();
    await writeFile(card, cardSource("changed"));
    const second = await build();
    expect(second.changes).toEqual([{ path: card, kind: "code" }]);
  });

  test("an animate config change recompiles, and the same config is a cache hit", async () => {
    await build({ duration: 500 });
    expect((await build({ duration: 500 })).steps.compile).toBeUndefined();
    expect((await build({ duration: 400 })).steps.compile).toBeDefined();
  });

  test("a cache hit is recorded in the report as a cached compile with no time", async () => {
    await build();
    const report = emptyReport(dir);
    const result = await Bun.build({
      entrypoints: [join(dir, "entry.ts")],
      plugins: [lusia({ dev: true, report })],
      throw: false,
    });
    expect(result.success).toBe(true);
    expect(report.compiles).toEqual([
      { file: card, ms: 0, bytes: Buffer.byteLength(cardSource()), cached: true },
    ]);
  });

  test("a deleted file is pruned from the cache", async () => {
    const gone = join(dir, "Gone.lusia");
    const source = cardSource();
    await writeFile(gone, source);
    const compiled = compile(source, gone);
    const entry: CachedModule = {
      stamp: stampFile(gone),
      dev: true,
      key: "",
      deps: compiled.deps,
      code: compiled.code,
      css: compiled.css,
      id: compiled.id,
      scriptAndMarkup: compiled.scriptAndMarkup,
    };
    storeModule(gone, entry);
    await unlink(gone);
    pruneModules();
    expect(storeModule(gone, entry)).toBeUndefined();
  });
});
