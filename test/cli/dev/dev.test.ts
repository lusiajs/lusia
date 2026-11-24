import { afterEach, describe, expect, test } from "bun:test";
import type { Subprocess } from "bun";
import http from "node:http";
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const FIXTURE = new URL("../fixtures/app", import.meta.url).pathname;
const RUNNER = new URL("../fixtures/run-dev.ts", import.meta.url).pathname;
const REPO = new URL("../../../", import.meta.url).pathname;
const SCRIPT_SRC = /src="(\.\/[^"]+\.js)"/;
const TIMEOUT_MS = 5000;

let dir: string;
let server: Subprocess<"ignore", "pipe", "ignore"> | undefined;

afterEach(async () => {
  server?.kill();
  server = undefined;
  if (dir) await rm(dir, { recursive: true, force: true });
});

// The dev server runs in a child process: the test preload replaces Response and fetch with happy-dom.
async function startServer(folder: string): Promise<URL> {
  const child = Bun.spawn([process.execPath, RUNNER, folder], { stdout: "pipe", stderr: "ignore" });
  server = child;
  const reader = child.stdout.getReader();
  const decoder = new TextDecoder();
  let text = "";
  while (!text.includes("\n")) {
    const { value, done } = await reader.read();
    if (done) throw new Error("dev server exited before it started");
    text += decoder.decode(value);
  }
  reader.releaseLock();
  return new URL(text.trim());
}

// happy-dom also replaces the global URL, so requests go through node:http with plain strings.
function get(url: URL): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    http
      .get(String(url), (response) => {
        let text = "";
        response.setEncoding("utf8");
        response.on("data", (chunk: string) => (text += chunk));
        response.on("end", () => resolve({ status: response.statusCode ?? 0, text }));
      })
      .on("error", reject);
  });
}

async function fetchText(url: URL): Promise<string> {
  return (await get(url)).text;
}

/** The bundle the page currently references. */
async function currentBundle(base: URL): Promise<string> {
  const html = await fetchText(base);
  const src = SCRIPT_SRC.exec(html)?.[1];
  if (!src) throw new Error(`no script in page: ${html}`);
  return fetchText(new URL(src, base));
}

async function waitForBundle(base: URL, text: string): Promise<void> {
  const deadline = Date.now() + TIMEOUT_MS;
  while (!(await currentBundle(base)).includes(text)) {
    if (Date.now() > deadline) throw new Error(`bundle never contained "${text}"`);
    await Bun.sleep(50);
  }
}

describe("startDev", () => {
  test("serves the page, public files and the bundle, then rebuilds on edit", async () => {
    dir = await mkdtemp(join(tmpdir(), "lusia-dev-"));
    await cp(FIXTURE, dir, {
      recursive: true,
      filter: (source) => !source.includes("node_modules"),
    });
    await mkdir(join(dir, "node_modules"));
    await symlink(REPO, join(dir, "node_modules", "lusiajs"), "dir");
    const base = await startServer(dir);

    const html = await fetchText(base);
    expect(html).toContain("/__lusia/reload");
    expect(await currentBundle(base)).toContain("Hello from the fixture");
    expect(await fetchText(new URL("/robots.txt", base))).toBe("User-agent: *\n");
    expect((await get(new URL("/missing.js", base))).status).toBe(404);

    const component = join(dir, "src/Greeting.lusia");
    await writeFile(
      component,
      (await readFile(component, "utf8")).replace("Hello from the fixture", "Edited in dev"),
    );
    await waitForBundle(base, "Edited in dev");
  });
});

describe("hot updates", () => {
  test("a component edit sends a hot message, not a reload, and serves the new module", async () => {
    dir = await mkdtemp(join(tmpdir(), "lusia-hot-"));
    await cp(FIXTURE, dir, {
      recursive: true,
      filter: (source) => !source.includes("node_modules"),
    });
    await mkdir(join(dir, "node_modules"));
    await symlink(REPO, join(dir, "node_modules", "lusiajs"), "dir");
    const base = await startServer(dir);

    const messages: { type: string; url?: string }[] = [];
    const socket = new WebSocket(`ws://${base.host}/__lusia/reload`);
    socket.onmessage = (event) => messages.push(JSON.parse(String(event.data)));
    await new Promise((resolve) => (socket.onopen = resolve));

    const component = join(dir, "src/Greeting.lusia");
    await writeFile(
      component,
      (await readFile(component, "utf8")).replace("Hello from the fixture", "Hot edit"),
    );
    const deadline = Date.now() + TIMEOUT_MS;
    while (messages.length === 0 && Date.now() < deadline) await Bun.sleep(50);
    socket.close();

    expect(messages.map((message) => message.type)).toEqual(["hot"]);
    const hot = await get(new URL(messages[0]!.url!, base));
    expect(hot.status).toBe(200);
    expect(hot.text).toContain("Hot edit");
  });
});
