import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runClean } from "#cli/clean/clean.ts";

let dir: string;
let output: string[];
let write: ReturnType<typeof spyOn>;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "lusia-clean-"));
  output = [];
  write = spyOn(process.stdout, "write").mockImplementation((text: string | Uint8Array) => {
    output.push(String(text));
    return true;
  });
});

afterEach(async () => {
  write.mockRestore();
  await rm(dir, { recursive: true, force: true });
});

async function writeCache(): Promise<void> {
  await mkdir(join(dir, ".lusia", "cache", "packages"), { recursive: true });
  await writeFile(join(dir, ".lusia", "cache", "styles.json"), "x".repeat(2048));
  await writeFile(join(dir, ".lusia", "cache", "packages", "react.js"), "y".repeat(1024));
}

describe("runClean", () => {
  test("deletes .lusia/cache and reports its size", async () => {
    await writeCache();
    expect(await runClean({ name: "clean", dir, quiet: false })).toBe(0);
    expect(existsSync(join(dir, ".lusia", "cache"))).toBe(false);
    expect(output.join("")).toBe("removed .lusia/cache (3.0 KB)\n");
  });

  test("keeps the rest of the .lusia folder and the app files", async () => {
    await writeCache();
    await writeFile(join(dir, ".lusia", "screens.d.ts"), "export {};\n");
    await writeFile(join(dir, "index.html"), "<html></html>\n");
    await runClean({ name: "clean", dir, quiet: true });
    expect(await readFile(join(dir, ".lusia", "screens.d.ts"), "utf8")).toBe("export {};\n");
    expect(existsSync(join(dir, "index.html"))).toBe(true);
  });

  test("reports nothing to clean when there is no cache folder", async () => {
    expect(await runClean({ name: "clean", dir, quiet: false })).toBe(0);
    expect(output.join("")).toBe("nothing to clean\n");
  });

  test("quiet hides the message but still deletes", async () => {
    await writeCache();
    await runClean({ name: "clean", dir, quiet: true });
    expect(output).toEqual([]);
    expect(existsSync(join(dir, ".lusia", "cache"))).toBe(false);
  });
});
