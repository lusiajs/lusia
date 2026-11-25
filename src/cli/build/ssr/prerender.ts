import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { routePages } from "../route-pages.ts";
import { staticRouteFile } from "../routes.ts";
import { assemblePage } from "./page.ts";
import { renderRoute } from "./render-route.ts";
import { sharedStyles, styleFileName, styleSheet } from "./styles.ts";
import type { RenderResult, RenderSettings } from "./types.ts";

export interface PrerenderOptions {
  dir: string;
  outdir: string;
  routes: Record<string, string>;
  settings: RenderSettings;
}

const NOT_FOUND_ROUTE = "*";
const NOT_FOUND_ADDRESS = "/404";

interface RenderedFile {
  file: string;
  result: RenderResult;
}

/** Writes the HTML of every static route. Routes with a :name part stay for the browser. */
export async function prerenderRoutes(options: PrerenderOptions): Promise<void> {
  const pages = routePages(options.dir, options.routes)?.pages ?? {};
  const indexPath = join(options.outdir, "index.html");
  const source = await Bun.file(indexPath).text();
  const rendered: RenderedFile[] = [];
  for (const route of Object.keys(pages)) {
    const file = staticRouteFile(options.outdir, route);
    if (file === undefined) continue;
    const urlPath = route === NOT_FOUND_ROUTE ? NOT_FOUND_ADDRESS : route;
    const result = await renderRoute({
      route,
      urlPath,
      pages,
      indexPath,
      settings: options.settings,
    });
    rendered.push({ file, result });
  }
  const styles = sharedStyles(rendered.map(({ result }) => result.styles));
  const sheet = styleSheet(styles);
  const cssName = sheet === "" ? undefined : styleFileName(sheet);
  if (cssName) await writeFile(join(options.outdir, cssName), sheet);
  for (const { file, result } of rendered) {
    await mkdir(dirname(file), { recursive: true });
    const html = assemblePage({
      source,
      head: result.head,
      body: result.body,
      styleIds: styles.map((style) => style.id),
      cssName,
    });
    await writeFile(file, html);
  }
}
