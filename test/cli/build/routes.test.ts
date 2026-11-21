import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseCommand, UsageError } from "#cli/args/args.ts";
import { runBuild } from "#cli/build/build.ts";
import { isPageRoute } from "#cli/dev/dev-server.ts";

const FIXTURE = new URL("../fixtures/app", import.meta.url).pathname;
const DEV_SERVER = new URL("../../../src/cli/dev/dev-server.ts", import.meta.url).pathname;

let workRoot: string;

beforeAll(async () => {
  workRoot = await mkdtemp(join(tmpdir(), "lusia-routes-"));
});

afterAll(async () => {
  await rm(workRoot, { recursive: true, force: true });
});

describe("--routes", () => {
  test("splits the list and trims it", async () => {
    const command = await parseCommand(["build", FIXTURE, "--routes", "/guide, /reference"], {});
    expect(command).toMatchObject({ name: "build", routes: ["/guide", "/reference"] });
  });

  test("defaults to no routes", async () => {
    expect(await parseCommand(["build", FIXTURE], {})).toMatchObject({ routes: [] });
  });

  test("rejects a route without a leading slash or with ..", async () => {
    await expect(parseCommand(["build", "--routes", "guide"], {})).rejects.toThrow(UsageError);
    await expect(parseCommand(["build", "--routes", "/a/../b"], {})).rejects.toThrow(UsageError);
  });

  test("build writes a copy of index.html for each route", async () => {
    const outdir = join(workRoot, "dist");
    expect(
      await runBuild({
        dir: FIXTURE,
        outdir,
        minify: true,
        routes: ["/guide", "/reference/api"],
        lazy: { mode: "smart", prefetch: "idle" },
      }),
    ).toBe(0);
    const root = await readFile(join(outdir, "index.html"), "utf8");
    expect(await readFile(join(outdir, "guide", "index.html"), "utf8")).toBe(root);
    expect(await readFile(join(outdir, "reference", "api", "index.html"), "utf8")).toBe(root);
  });
});

describe("dev server client routes", () => {
  test("only GET paths without a file extension are page routes", () => {
    expect(isPageRoute("GET", "/guide")).toBe(true);
    expect(isPageRoute("GET", "/guide/")).toBe(true);
    expect(isPageRoute("GET", "/app.js")).toBe(false);
    expect(isPageRoute("POST", "/guide")).toBe(false);
  });

  test("a deep link gets index.html and a missing asset gets 404", async () => {
    // A child process: the test preload replaces fetch with happy-dom's.
    const script = `
      import { createDevServer } from "${DEV_SERVER}";
      const server = createDevServer({ dir: "/", port: 0 });
      server.publish(new Map([["index.html", new Blob(["<p>root</p>"], { type: "text/html" })]]), { kind: "reload" });
      const page = await fetch(new URL("/guide/intro", server.url));
      const asset = await fetch(new URL("/missing.js", server.url));
      console.log(JSON.stringify({ page: [page.status, await page.text()], asset: asset.status }));
      server.stop();
    `;
    const child = Bun.spawn(["bun", "-e", script], { stdout: "pipe", stderr: "pipe" });
    const out = JSON.parse(await new Response(child.stdout).text());
    expect(await child.exited).toBe(0);
    expect(out).toEqual({ page: [200, "<p>root</p>"], asset: 404 });
  });
});
