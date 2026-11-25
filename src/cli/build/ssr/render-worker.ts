import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { lusia } from "#bun-plugin/index.ts";
import type { RoutePages } from "#runtime/internal.ts";
import type { RenderRequest, RenderResult } from "./types.ts";

function pageLoaders(pages: Record<string, string>): RoutePages {
  return Object.fromEntries(
    Object.entries(pages).map(([route, file]) => [route, () => import(file)]),
  );
}

async function loadIndex(indexPath: string): Promise<void> {
  const source = new DOMParser().parseFromString(await Bun.file(indexPath).text(), "text/html");
  source.querySelectorAll("script").forEach((script) => script.remove());
  document.head.innerHTML = source.head.innerHTML;
  document.body.innerHTML = source.body.innerHTML;
}

function collect(): RenderResult {
  const head = document.head.cloneNode(true) as HTMLElement;
  head.querySelectorAll("script, style[data-lusia]").forEach((node) => node.remove());
  const styles = [...document.head.querySelectorAll<HTMLElement>("style[data-lusia]")].map(
    (style) => ({ id: style.dataset.lusia ?? "", css: style.textContent ?? "" }),
  );
  return { head: head.innerHTML, body: document.body.innerHTML, styles };
}

async function render(request: RenderRequest): Promise<RenderResult> {
  // The router reads the address when its module loads, so the DOM is set up before any runtime import.
  GlobalRegistrator.register({ url: `http://localhost${request.urlPath}` });
  (globalThis as { __LUSIA_SSR__?: boolean }).__LUSIA_SSR__ = true;
  Bun.plugin(lusia({ ...request.settings, dev: false }));
  await loadIndex(request.indexPath);
  const { startRoutes, settledRenders } = await import("#runtime/internal.ts");
  await startRoutes(pageLoaders(request.pages), document.body);
  await settledRenders();
  return collect();
}

const request = JSON.parse(process.argv[2] ?? "{}") as RenderRequest;
try {
  await Bun.write(request.resultPath, JSON.stringify(await render(request)));
  process.exit(0);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  const file = request.pages[request.route] ?? request.route;
  process.stderr.write(`could not render "${request.route}" from ${file}: ${message}\n`);
  process.exit(1);
}
