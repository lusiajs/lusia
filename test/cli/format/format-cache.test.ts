import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { openFormatCache } from "#cli/format/format-cache.ts";

const UNFORMATTED = "<p>   hi</p>\n";
const FORMATTED = "<p>hi</p>\n";
const CONFIG = { printWidth: 100 };

let root: string;
let caseIndex = 0;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "lusia-format-cache-"));
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

/** A folder with the node_modules folder the cache lives under. */
async function folder(): Promise<string> {
  const dir = join(root, `case-${caseIndex++}`);
  await mkdir(join(dir, "node_modules"), { recursive: true });
  return dir;
}

describe("openFormatCache", () => {
  test("is unknown, changed and clean as the content is recorded", async () => {
    const dir = await folder();
    const cache = openFormatCache(dir)!;
    const file = join(dir, "Card.lusia");
    expect(cache.decide(file, UNFORMATTED, CONFIG)).toBe("unknown");

    cache.record(file, UNFORMATTED, FORMATTED, CONFIG);
    expect(cache.decide(file, UNFORMATTED, CONFIG)).toBe("changed");
    expect(cache.decide(file, FORMATTED, CONFIG)).toBe("clean");
    expect(cache.decide(file, `${UNFORMATTED}<p>x</p>`, CONFIG)).toBe("unknown");
  });

  test("a different Prettier config makes the entry unknown", async () => {
    const dir = await folder();
    const cache = openFormatCache(dir)!;
    const file = join(dir, "Card.lusia");
    cache.record(file, UNFORMATTED, FORMATTED, CONFIG);
    expect(cache.decide(file, FORMATTED, { printWidth: 80 })).toBe("unknown");
  });

  test("saves and reads the entries back", async () => {
    const dir = await folder();
    const file = join(dir, "Card.lusia");
    const cache = openFormatCache(dir)!;
    cache.record(file, UNFORMATTED, FORMATTED, CONFIG);
    cache.save();

    const reopened = openFormatCache(dir)!;
    expect(reopened.decide(file, FORMATTED, CONFIG)).toBe("clean");
    expect(reopened.decide(file, UNFORMATTED, CONFIG)).toBe("changed");
  });

  test("a corrupt cache file means no cache", async () => {
    const dir = await folder();
    const file = join(dir, "Card.lusia");
    await mkdir(join(dir, ".lusia", "cache"), { recursive: true });
    await writeFile(join(dir, ".lusia", "cache", "format.json"), "not json");
    const cache = openFormatCache(dir)!;
    expect(cache.decide(file, FORMATTED, CONFIG)).toBe("unknown");
  });
});
