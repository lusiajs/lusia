import { describe, expect, test } from "bun:test";
import { statSync } from "node:fs";
import { mkdtemp, readFile, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isFileUnchanged, stampFile } from "#compiler/utils/file-stamp.ts";

let dir: string;
let path: string;

async function setup(content: string): Promise<void> {
  dir = await mkdtemp(join(tmpdir(), "lusia-stamp-"));
  path = join(dir, "_tokens.scss");
  await writeFile(path, content);
}

async function teardown(): Promise<void> {
  await rm(dir, { recursive: true, force: true });
}

describe("stampFile", () => {
  test("records the modified time and the Bun hash of the bytes", async () => {
    await setup("$a: red;");
    const stamp = stampFile(path);
    expect(stamp.path).toBe(path);
    expect(stamp.lastModified).toBe(statSync(path).mtimeMs);
    expect(stamp.hash).toBe(Bun.hash(await readFile(path)).toString(16));
    await teardown();
  });
});

describe("isFileUnchanged", () => {
  test("a file with the same modified time is unchanged", async () => {
    await setup("$a: red;");
    const stamp = stampFile(path);
    await writeFile(path, "$a: blue;");
    await utimes(path, stamp.lastModified / 1000, stamp.lastModified / 1000);
    expect(isFileUnchanged(stamp)).toBe(true);
    await teardown();
  });

  test("a new modified time with the same content is unchanged", async () => {
    await setup("$a: red;");
    const stamp = { ...stampFile(path), lastModified: 1 };
    expect(isFileUnchanged(stamp)).toBe(true);
    await teardown();
  });

  test("a new modified time with new content is changed", async () => {
    await setup("$a: red;");
    const stamp = stampFile(path);
    await writeFile(path, "$a: blue;");
    expect(isFileUnchanged(stamp)).toBe(false);
    await teardown();
  });

  test("a missing file is changed", async () => {
    await setup("$a: red;");
    const stamp = stampFile(path);
    await rm(path);
    expect(isFileUnchanged(stamp)).toBe(false);
    await teardown();
  });
});
