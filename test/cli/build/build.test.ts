import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { cp, mkdir, mkdtemp, readdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runBuild } from "#cli/build/build.ts";

const FIXTURE = new URL("../fixtures/app", import.meta.url).pathname;
const REPO = new URL("../../../", import.meta.url).pathname;
const CHUNK_JS = /^chunk-\w+\.js$/;

let workRoot: string;
let outdir: string;

beforeAll(async () => {
  workRoot = await mkdtemp(join(tmpdir(), "lusia-build-"));
  outdir = join(workRoot, "dist");
});

afterAll(async () => {
  await rm(workRoot, { recursive: true, force: true });
});

describe("runBuild", () => {
  test("bundles the app, hashes the script and copies public/", async () => {
    await mkdir(outdir, { recursive: true });
    await writeFile(join(outdir, "stale.txt"), "old");
    expect(
      await runBuild({
        dir: FIXTURE,
        outdir,
        minify: true,
        lazy: { mode: "smart", prefetch: "idle" },
      }),
    ).toBe(0);

    const files = await readdir(outdir);
    expect(files).not.toContain("stale.txt");
    const script = files.find((file) => CHUNK_JS.test(file));
    expect(script).toBeDefined();

    const html = await readFile(join(outdir, "index.html"), "utf8");
    expect(html).toContain(script!);
    expect(await readFile(join(outdir, "robots.txt"), "utf8")).toBe("User-agent: *\n");

    const bundle = await readFile(join(outdir, script!), "utf8");
    expect(bundle).toContain("Hello from the fixture");
    expect(bundle).toContain("rebeccapurple");
  });

  test("returns 1 and reports the error for a broken component", async () => {
    const broken = join(workRoot, "broken");
    await cp(FIXTURE, broken, { recursive: true });
    await mkdir(join(broken, "node_modules"));
    await symlink(REPO, join(broken, "node_modules", "lusia"), "dir");
    await writeFile(
      join(broken, "src/Greeting.lusia"),
      "<script>export const value = 1;</script>\n<p>x</p>\n",
    );
    expect(
      await runBuild({
        dir: broken,
        outdir: join(workRoot, "broken-dist"),
        minify: true,
        lazy: { mode: "smart", prefetch: "idle" },
      }),
    ).toBe(1);
  });

  test("refuses the app folder itself as the output folder", async () => {
    expect(
      await runBuild({
        dir: FIXTURE,
        outdir: FIXTURE,
        minify: true,
        lazy: { mode: "smart", prefetch: "idle" },
      }),
    ).toBe(1);
  });

  test("refuses an output folder that holds the app", async () => {
    expect(
      await runBuild({
        dir: FIXTURE,
        outdir: join(FIXTURE, ".."),
        minify: true,
        lazy: { mode: "smart", prefetch: "idle" },
      }),
    ).toBe(1);
  });
});
