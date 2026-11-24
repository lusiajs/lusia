import { isIgnoredBrowserError } from "./ignored-browser-errors.ts";
import type { ServerWebSocket } from "bun";
import { assetKey } from "../build/bundle.ts";
import type { Assets } from "../build/dev-build.ts";
import type { HotModule } from "../build/hot-build.ts";
import { PACKAGE_URL_PREFIX } from "../build/package-manifest.ts";
import { publicFile } from "../build/public.ts";
import { RELOAD_PATH } from "./hot-reload.ts";
import { now } from "../build/timings.ts";
import type { Update } from "./update.ts";

/** A GET with no file extension is a client route and gets index.html. */
export function isPageRoute(method: string, pathname: string): boolean {
  return method === "GET" && !/\.[^/]*$/.test(pathname);
}

export interface BrowserError {
  page: string;
  message: string;
  stack: string;
}

export interface DevServerOptions {
  dir: string;
  port: number;
  /** Called with the time from a publish to the page's `ready` report. */
  onReady?: (ms: number) => void;
  onBrowserError?: (error: BrowserError) => void;
}

export interface DevServer {
  readonly url: URL;
  publish(assets: Assets, update: Update, modules?: HotModule[]): void;
  showError(message: string): void;
  stop(): void;
}

type Socket = ServerWebSocket<unknown>;

// Hot modules are needed only until the page has imported them, so the oldest are dropped.
const MAX_HOT_MODULES = 50;
const MAX_STACK_LINES = 20;
const NO_CACHE = { "cache-control": "no-cache" };

export function createDevServer({
  dir,
  port,
  onReady,
  onBrowserError,
}: DevServerOptions): DevServer {
  let assets: Assets = new Map();
  const hotModules = new Map<string, Blob>();
  let error: string | null = null;
  let publishedAt: number | null = null;
  const sockets = new Set<Socket>();

  const server = Bun.serve({
    port,
    fetch(request, instance) {
      if (new URL(request.url).pathname === RELOAD_PATH) {
        return instance.upgrade(request)
          ? undefined
          : new Response("expected a websocket", { status: 400 });
      }
      return respond(request);
    },
    websocket: {
      open(socket) {
        sockets.add(socket);
        if (error !== null) socket.send(JSON.stringify({ type: "error", message: error }));
      },
      close(socket) {
        sockets.delete(socket);
      },
      message(_socket, text) {
        const report = parseReport(text);
        if (report?.type === "ready") reportReady();
        else if (report?.type === "browser-error") reportBrowserError(report);
      },
    },
  });

  async function respond(request: Request): Promise<Response> {
    const { pathname } = new URL(request.url);
    const hot = hotModules.get(pathname);
    if (hot) return new Response(hot, { headers: { "content-type": "text/javascript" } });
    const asset = assets.get(assetKey(pathname));
    if (asset) return assetResponse(request, pathname, asset);
    const file = publicFile(dir, pathname);
    if (file && (await file.exists())) return new Response(file, { headers: NO_CACHE });
    const index = assets.get(assetKey("index.html"));
    if (index && isPageRoute(request.method, pathname))
      return new Response(index, { headers: NO_CACHE });
    return new Response("not found", { status: 404 });
  }

  function broadcast(message: object): void {
    const text = JSON.stringify(message);
    for (const socket of sockets) socket.send(text);
  }

  function keepHotModule({ url, body }: HotModule): void {
    hotModules.set(url, body);
    if (hotModules.size > MAX_HOT_MODULES) hotModules.delete(hotModules.keys().next().value!);
  }

  function reportReady(): void {
    if (publishedAt === null) return;
    const ms = now() - publishedAt;
    publishedAt = null;
    onReady?.(ms);
  }

  function reportBrowserError(report: ClientReport): void {
    const browserError = toBrowserError(report);
    if (!browserError || isIgnoredBrowserError(browserError.message)) return;
    onBrowserError?.(browserError);
  }

  function messagesFor(update: Update, modules: HotModule[]): object[] {
    if (update.kind === "reload") return [{ type: "reload" }];
    const styles = update.styles.map((style) => ({ type: "css", id: style.id, css: style.css }));
    if (update.kind === "styles") return styles;
    return [...modules.map(({ url }) => ({ type: "hot", url })), ...styles];
  }

  return {
    url: new URL(`http://localhost:${server.port}/`),
    publish(next, update, modules = []) {
      assets = next;
      error = null;
      for (const module of modules) keepHotModule(module);
      const messages = messagesFor(update, modules);
      if (messages.length === 0) return;
      for (const message of messages) broadcast(message);
      if (sockets.size > 0) publishedAt = now();
    },
    showError(message) {
      error = message;
      broadcast({ type: "error", message });
    },
    stop() {
      sockets.clear();
      server.stop(true);
    },
  };
}

type ClientReport = Record<string, unknown>;

// Package entries are named by package, not content, so browsers must revalidate them.
async function assetResponse(request: Request, pathname: string, asset: Blob): Promise<Response> {
  if (!pathname.startsWith(PACKAGE_URL_PREFIX)) return new Response(asset, { headers: NO_CACHE });
  const bytes = await asset.arrayBuffer();
  const etag = `"${Bun.hash(bytes)}"`;
  const headers = { ...NO_CACHE, etag };
  if (request.headers.get("if-none-match") === etag)
    return new Response(null, { status: 304, headers });
  return new Response(bytes, { headers: { ...headers, "content-type": asset.type } });
}

function parseReport(text: string | Buffer): ClientReport | null {
  try {
    const report: unknown = JSON.parse(String(text));
    return typeof report === "object" && report !== null ? (report as ClientReport) : null;
  } catch {
    return null;
  }
}

function toBrowserError({ page, message, stack }: ClientReport): BrowserError | null {
  if (typeof page !== "string" || typeof message !== "string" || typeof stack !== "string")
    return null;
  return { page, message, stack: truncateStack(stack) };
}

function truncateStack(stack: string): string {
  return stack.split("\n").slice(0, MAX_STACK_LINES).join("\n");
}
