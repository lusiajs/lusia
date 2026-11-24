import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  cachedModule,
  cachedModuleEntries,
  pruneModules,
  storeModule,
  toCachedModule,
} from "#bun-plugin/cache.ts";
import { compile } from "#compiler/index.ts";
import {
  compileCachePath,
  loadCompileCache,
  saveCompileCache,
} from "#cli/build/compile-disk-cache.ts";
import { cacheStamp } from "#cli/build/cache-stamp.ts";

const KEY = "key";

let dir: string;
let card: string;
let tokens: string;

function cardSource(label: string): string {
  return [
    "<script>",
    `const label = "${label}";`,
    "</script>",
    "",
    '<p class="card">card</p>',
    "",
    '<style lang="scss">',
    '@use "tokens";',
    ".card { color: tokens.$accent; }",
    "</style>",
    "",
  ].join("\n");
}

function primedPaths(): string[] {
  return cachedModuleEntries().map((cached) => cached.path);
}

/** Drops the file from memory, as a restart does, then writes it back with the given text. */
async function restart(text: string): Promise<void> {
  await rm(card, { force: true });
  pruneModules();
  await writeFile(card, text);
}

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "lusia-compile-cache-"));
  card = join(dir, "Card.lusia");
  tokens = join(dir, "_tokens.scss");
  await writeFile(tokens, "$accent: red;\n");
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

async function saveCard(source: string): Promise<void> {
  await writeFile(card, source);
  storeModule(card, toCachedModule(source, true, compile(source, card), KEY));
  await saveCompileCache(dir);
}

describe("compile disk cache", () => {
  test("a saved module is primed after a restart and is a cache hit", async () => {
    const source = cardSource("card");
    await saveCard(source);
    await restart(source);
    await loadCompileCache(dir);
    expect(cachedModule(card, source, true, KEY)).toBeDefined();
  });

  test("a file whose text changed is not primed", async () => {
    await saveCard(cardSource("card"));
    await restart(cardSource("changed"));
    await loadCompileCache(dir);
    expect(primedPaths()).not.toContain(card);
  });

  test("a file whose Sass import changed is not primed", async () => {
    const source = cardSource("card");
    await saveCard(source);
    await restart(source);
    await writeFile(tokens, "$accent: blue;\n");
    await loadCompileCache(dir);
    expect(primedPaths()).not.toContain(card);
  });

  test("a cache written by another compiler stamp is ignored", async () => {
    const source = cardSource("card");
    await saveCard(source);
    const saved = JSON.parse(await readFile(compileCachePath(dir), "utf8"));
    saved.stamp = `${await cacheStamp()}-old`;
    await writeFile(compileCachePath(dir), JSON.stringify(saved));
    await restart(source);
    await loadCompileCache(dir);
    expect(primedPaths()).not.toContain(card);
  });

  test("a corrupt cache file is ignored", async () => {
    await mkdir(join(dir, "node_modules", ".cache", "lusia"), { recursive: true });
    await writeFile(compileCachePath(dir), "{ not json");
    await expect(loadCompileCache(dir)).resolves.toBeUndefined();
    expect(primedPaths()).not.toContain(card);
  });

  test("a malformed entry is skipped without stopping the load", async () => {
    await mkdir(join(dir, "node_modules", ".cache", "lusia"), { recursive: true });
    const stamp = await cacheStamp();
    await writeFile(compileCachePath(dir), JSON.stringify({ stamp, entries: [null] }));
    await expect(loadCompileCache(dir)).resolves.toBeUndefined();
    expect(primedPaths()).not.toContain(card);
  });
});
