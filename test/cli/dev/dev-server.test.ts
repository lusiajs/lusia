import { describe, expect, test } from "bun:test";

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
