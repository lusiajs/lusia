import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseCommand } from "#cli/args/args.ts";
import { cacheOf } from "#cli/args/settings.ts";
import { runBuild } from "#cli/build/build.ts";
import { writeRouteIndexes } from "#cli/build/routes.ts";
import { isPageRoute } from "#cli/dev/dev-server.ts";

const ROUTES_APP = new URL("../fixtures/routes-app", import.meta.url).pathname;
const DEV_SERVER = new URL("../../../src/cli/dev/dev-server.ts", import.meta.url).pathname;
const MODULE_SCRIPT = /<script type="module"[^>]*src="[^"]+"/;

let workRoot: string;

beforeAll(async () => {
  workRoot = await mkdtemp(join(tmpdir(), "lusia-routes-"));
});

afterAll(async () => {
  await rm(workRoot, { recursive: true, force: true });
});

describe("routes in the config", () => {
  test("the build command reads the route map", async () => {
    expect(await parseCommand(["build", ROUTES_APP], {})).toMatchObject({
      name: "build",
      routes: { "/guide": "src/pages/Guide.lusia", "*": "src/pages/Home.lusia" },
    });
  });

  test("the dev command reads the route map", async () => {
    expect(await parseCommand(["dev", ROUTES_APP], {})).toMatchObject({
      name: "dev",
      routes: { "/guide": "src/pages/Guide.lusia", "*": "src/pages/Home.lusia" },
    });
  });

  test("defaults to no routes", async () => {
    expect(await parseCommand(["build", ROUTES_APP, "--no-cache"], {})).toMatchObject({
      routes: { "/guide": "src/pages/Guide.lusia", "*": "src/pages/Home.lusia" },
    });
    expect(await parseCommand(["build", join(workRoot, "missing-config")], {})).toMatchObject({
      routes: {},
    });
  });
});

describe("writeRouteIndexes", () => {
  test("copies index.html to each static route and to 404.html for *", async () => {
    const outdir = join(workRoot, "indexes");
    await mkdir(outdir, { recursive: true });
    await writeFile(join(outdir, "index.html"), "<p>root</p>");
    await writeRouteIndexes(outdir, {
      "/": "src/pages/Home.lusia",
      "/guide": "src/pages/Guide.lusia",
      "/user/:id": "src/pages/User.lusia",
      "*": "src/pages/Home.lusia",
    });
    expect(await readFile(join(outdir, "guide", "index.html"), "utf8")).toBe("<p>root</p>");
    expect(await readFile(join(outdir, "404.html"), "utf8")).toBe("<p>root</p>");
    expect(await readFile(join(outdir, "index.html"), "utf8")).toBe("<p>root</p>");
    expect(await Bun.file(join(outdir, "user")).exists()).toBe(false);
  });
});

describe("runBuild with routes", () => {
  test("writes the start script into index.html and an index for each route", async () => {
    const outdir = join(workRoot, "dist");
    expect(
      await runBuild({
        dir: ROUTES_APP,
        outdir,
        minify: true,
        cache: cacheOf({}, false),
        routes: { "/guide": "src/pages/Guide.lusia", "*": "src/pages/Home.lusia" },
        ssr: false,
        lazy: { mode: "smart", prefetch: "idle" },
        quiet: true,
      }),
    ).toBe(0);
    const root = await readFile(join(outdir, "index.html"), "utf8");
    expect(root).toMatch(MODULE_SCRIPT);
    expect(await readFile(join(outdir, "guide", "index.html"), "utf8")).toBe(root);
    expect(await readFile(join(outdir, "404.html"), "utf8")).toBe(root);
  });

  test("route pages load their assets from the site root", async () => {
    const outdir = join(workRoot, "dist-root-assets");
    expect(
      await runBuild({
        dir: ROUTES_APP,
        outdir,
        minify: true,
        cache: cacheOf({}, false),
        routes: { "/guide": "src/pages/Guide.lusia", "*": "src/pages/Home.lusia" },
        lazy: { mode: "smart", prefetch: "idle" },
        quiet: true,
      }),
    ).toBe(0);
    for (const page of ["guide/index.html", "404.html"]) {
      const html = await readFile(join(outdir, page), "utf8");
      expect(html).toMatch(/<script type="module"[^>]*src="\/chunk-/);
    }
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
