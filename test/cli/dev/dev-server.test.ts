import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const DEV_SERVER = new URL("../../../src/cli/dev/dev-server.ts", import.meta.url).pathname;

// A child process: the test preload replaces WebSocket and fetch with happy-dom's.
async function runServer(body: string): Promise<unknown> {
  const script = `
    import { createDevServer } from "${DEV_SERVER}";
    const readies = [];
    const browserErrors = [];
    const server = createDevServer({
      dir: "/",
      port: 0,
      onReady: (ms) => readies.push(typeof ms),
      onBrowserError: (error) => browserErrors.push(error),
    });
    const socket = new WebSocket("ws://localhost:" + server.url.port + "/__lusia/reload");
    const messages = [];
    socket.onmessage = (event) => {
      const message = JSON.parse(String(event.data));
      messages.push(message);
      if (message.type === "css") socket.send(JSON.stringify({ type: "ready" }));
    };
    await new Promise((resolve) => (socket.onopen = resolve));
    ${body}
    await Bun.sleep(100);
    console.log(JSON.stringify({ messages, readies, browserErrors }));
    socket.close();
    server.stop();
  `;
  const child = Bun.spawn([process.execPath, "-e", script], { stdout: "pipe", stderr: "pipe" });
  const out = JSON.parse(await new Response(child.stdout).text());
  expect(await child.exited).toBe(0);
  return out;
}

describe("dev server publish", () => {
  test("a style-only update sends one css message per style, not a reload", async () => {
    const out = await runServer(`
      server.publish(new Map(), { kind: "styles", styles: [{ id: "abc", css: ".a{}" }] });
    `);
    expect(out).toEqual({
      messages: [{ type: "css", id: "abc", css: ".a{}" }],
      readies: ["number"],
      browserErrors: [],
    });
  });

  test("a style update with nothing changed sends nothing", async () => {
    const out = await runServer(`
      server.publish(new Map(), { kind: "styles", styles: [] });
    `);
    expect(out).toEqual({ messages: [], readies: [], browserErrors: [] });
  });

  test("a reload update sends a reload message", async () => {
    const out = await runServer(`
      server.publish(new Map(), { kind: "reload" });
    `);
    expect(out).toEqual({ messages: [{ type: "reload" }], readies: [], browserErrors: [] });
  });

  test("a ready report with no publish before it is ignored", async () => {
    const out = await runServer(`
      socket.send(JSON.stringify({ type: "ready" }));
      await Bun.sleep(50);
      server.publish(new Map(), { kind: "styles", styles: [{ id: "abc", css: ".a{}" }] });
    `);
    expect(out).toEqual({
      messages: [{ type: "css", id: "abc", css: ".a{}" }],
      readies: ["number"],
      browserErrors: [],
    });
  });
});

describe("dev server browser errors", () => {
  test("a browser-error report reaches onBrowserError", async () => {
    const out = await runServer(`
      socket.send(JSON.stringify({ type: "browser-error", page: "/guide", message: "boom", stack: "Error: boom\\nsrc/a.lusia:1:2" }));
      await Bun.sleep(50);
    `);
    expect(out).toMatchObject({
      browserErrors: [{ page: "/guide", message: "boom", stack: "Error: boom\nsrc/a.lusia:1:2" }],
    });
  });

  test("a stack longer than 20 lines is cut to 20", async () => {
    const out = await runServer(`
      const stack = Array.from({ length: 30 }, (_, index) => "line " + index).join("\\n");
      socket.send(JSON.stringify({ type: "browser-error", page: "/", message: "boom", stack }));
      await Bun.sleep(50);
    `);
    const [error] = (out as { browserErrors: { stack: string }[] }).browserErrors;
    expect(error?.stack.split("\n")).toHaveLength(20);
  });

  test("a report with missing fields or bad JSON is ignored", async () => {
    const out = await runServer(`
      socket.send("not json");
      socket.send(JSON.stringify({ type: "browser-error", page: "/" }));
      await Bun.sleep(50);
    `);
    expect(out).toMatchObject({ browserErrors: [] });
  });
});

// Serves two assets through a child process, then returns the status and cache headers of each GET.
async function fetchAssets(
  packagePath: string,
  appPath: string,
  requests: { path: string; headers?: Record<string, string> }[],
): Promise<{ status: number; cacheControl: string | null; etag: string | null; body: string }[]> {
  const script = `
    import { createDevServer } from "${DEV_SERVER}";
    const server = createDevServer({ dir: "/", port: 0 });
    server.publish(
      new Map([
        ["__lusia/packages/tiny-pkg.js", Bun.file(${JSON.stringify(packagePath)})],
        ["app.js", Bun.file(${JSON.stringify(appPath)})],
      ]),
      { kind: "reload" },
    );
    const requests = ${JSON.stringify(requests)};
    const out = [];
    for (const request of requests) {
      const response = await fetch(new URL(request.path, server.url), { headers: request.headers });
      out.push({
        status: response.status,
        cacheControl: response.headers.get("cache-control"),
        etag: response.headers.get("etag"),
        body: await response.text(),
      });
    }
    console.log(JSON.stringify(out));
    server.stop();
  `;
  const child = Bun.spawn([process.execPath, "-e", script], { stdout: "pipe", stderr: "pipe" });
  const out = JSON.parse(await new Response(child.stdout).text());
  expect(await child.exited).toBe(0);
  return out;
}

describe("dev server cache headers", () => {
  const dir = mkdtempSync(join(tmpdir(), "lusia-headers-"));
  const packagePath = join(dir, "tiny-pkg.js");
  const appPath = join(dir, "app.js");
  writeFileSync(packagePath, "export const tiny = 1;\n");
  writeFileSync(appPath, "console.log(1);\n");

  test("a package file revalidates with an etag and no long cache", async () => {
    const [response] = await fetchAssets(packagePath, appPath, [
      { path: "/__lusia/packages/tiny-pkg.js" },
    ]);
    expect(response).toMatchObject({
      status: 200,
      cacheControl: "no-cache",
      body: "export const tiny = 1;\n",
    });
    expect(response!.etag).toMatch(/^"\d+"$/);
  });

  test("a package file with a matching etag gets 304 with no body", async () => {
    const [first] = await fetchAssets(packagePath, appPath, [
      { path: "/__lusia/packages/tiny-pkg.js" },
    ]);
    const [second] = await fetchAssets(packagePath, appPath, [
      { path: "/__lusia/packages/tiny-pkg.js", headers: { "if-none-match": first!.etag! } },
    ]);
    expect(second).toMatchObject({ status: 304, cacheControl: "no-cache", body: "" });
  });

  test("an app asset is no-cache and has no etag", async () => {
    const [response] = await fetchAssets(packagePath, appPath, [{ path: "/app.js" }]);
    expect(response).toMatchObject({
      status: 200,
      cacheControl: "no-cache",
      etag: null,
      body: "console.log(1);\n",
    });
  });
});
