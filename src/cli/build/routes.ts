import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

const NOT_FOUND_KEY = "*";

/** Copies index.html to each static route, so a static host serves deep links. */
export async function writeRouteIndexes(
  outdir: string,
  routes: Record<string, string>,
): Promise<void> {
  for (const route of Object.keys(routes)) {
    const target = routeIndexPath(outdir, route);
    if (target === undefined) continue;
    await mkdir(dirname(target), { recursive: true });
    await copyFile(join(outdir, "index.html"), target);
  }
}

// "/" is dist/index.html already, and a route with ":" needs a server rule, not a copy.
function routeIndexPath(outdir: string, route: string): string | undefined {
  if (route === NOT_FOUND_KEY) return join(outdir, "404.html");
  if (route === "/" || route.includes(":")) return undefined;
  return join(outdir, route, "index.html");
}
