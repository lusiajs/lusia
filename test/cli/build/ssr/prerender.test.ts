import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseCommand } from "#cli/args/args.ts";
import { cacheOf } from "#cli/args/settings.ts";
import { runBuild } from "#cli/build/build.ts";

const SSR_APP = new URL("../../fixtures/ssr-app", import.meta.url).pathname;
const STYLE_FILE = /^lusia-[0-9a-z]{8}\.css$/;

const BUILD_TIMEOUT = 60_000;
let workRoot: string;

beforeAll(async () => {
  workRoot = await mkdtemp(join(tmpdir(), "lusia-ssr-"));
});

afterAll(async () => {
  await rm(workRoot, { recursive: true, force: true });
});

async function build(name: string, ssr: boolean): Promise<string> {
  const outdir = join(workRoot, name);
  const command = await parseCommand(["build", SSR_APP, "--no-cache"], {});
  if (command.name !== "build") throw new Error("expected a build command");
  const code = await runBuild({
    ...command,
    outdir,
    ssr,
    cache: cacheOf({}, false),
    quiet: true,
  });
  expect(code).toBe(0);
  return outdir;
}

async function read(outdir: string, file: string): Promise<string> {
  return readFile(join(outdir, file), "utf8");
}

describe("build-time SSR", () => {
  test(
    "the home page has its heading and title in the built HTML",
    async () => {
      const outdir = await build("on", true);
      const html = await read(outdir, "index.html");
      expect(html).toContain("Welcome home");
      expect(html).toContain("<title>Home</title>");
    },
    BUILD_TIMEOUT,
  );

  test(
    "a NO_SSR component shows its FALLBACK, not its body",
    async () => {
      const outdir = await build("editor-on", true);
      const html = await read(outdir, "editor/index.html");
      expect(html).toContain("loading editor");
      expect(html).not.toContain("editor body");
    },
    BUILD_TIMEOUT,
  );

  test(
    "the not-found page is written to 404.html",
    async () => {
      const outdir = await build("not-found-on", true);
      expect(await read(outdir, "404.html")).toContain("Nothing at this address");
    },
    BUILD_TIMEOUT,
  );

  test(
    "one shared CSS file holds the Layout style and is linked from the page",
    async () => {
      const outdir = await build("css-on", true);
      const files = (await readdir(outdir)).filter((name) => STYLE_FILE.test(name));
      expect(files.length).toBe(1);
      const css = await read(outdir, files[0]!);
      expect(css).toMatch(/\/\* lusia:/);
      expect(css).toMatch(/color:\s*rgb\(18,\s*52,\s*86\)/);
      const html = await read(outdir, "index.html");
      expect(html).toContain(`href="/${files[0]}"`);
      expect(html).toMatch(/data-lusia-styles="[^"]+"/);
    },
    BUILD_TIMEOUT,
  );

  test(
    "ssr false keeps the empty body",
    async () => {
      const outdir = await build("off", false);
      const html = await read(outdir, "index.html");
      expect(html).not.toContain("Welcome home");
      expect(html).toContain("<body></body>");
    },
    BUILD_TIMEOUT,
  );
});
