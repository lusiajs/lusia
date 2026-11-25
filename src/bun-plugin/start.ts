import type { PluginBuilder } from "bun";

export interface RoutePages {
  /** The app's index.html. Only this page gets the start script. */
  entry: string;
  /** Absolute page file for each route key, in config order. */
  pages: Record<string, string>;
}

const START_SPECIFIER = "lusia:start";
const START_NAMESPACE = "lusia-start";
const START_TAG = `<script type="module" src="${START_SPECIFIER}"></script>`;

export function startModule(pages: Record<string, string>): string {
  const entries = Object.entries(pages).map(
    ([route, file]) => `${JSON.stringify(route)}: () => import(${JSON.stringify(file)})`,
  );
  return `import { startRoutes } from "lusiajs/internal";\nstartRoutes({ ${entries.join(", ")} }, document.body);\n`;
}

export function withStartTag(html: string): string {
  return html.replace(/<\/body>/i, `${START_TAG}$&`);
}

export function setupStart(build: PluginBuilder, routes: RoutePages | undefined): void {
  if (!routes) return;
  build.onLoad({ filter: /index\.html$/ }, async ({ path }) => {
    if (path !== routes.entry) return undefined;
    return { contents: withStartTag(await Bun.file(path).text()), loader: "html" };
  });
  build.onResolve({ filter: /^lusia:start$/ }, () => ({
    path: START_SPECIFIER,
    namespace: START_NAMESPACE,
  }));
  build.onLoad({ filter: /.*/, namespace: START_NAMESPACE }, () => ({
    contents: startModule(routes.pages),
    loader: "ts",
  }));
}
