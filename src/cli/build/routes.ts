import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

const NOT_FOUND_KEY = "*";
const INDEX_ROUTE = "/";

/** The file a static route is written to. A route with a :name part has none: it needs a server rule. */
export function staticRouteFile(outdir: string, route: string): string | undefined {
  if (route === NOT_FOUND_KEY) return join(outdir, "404.html");
  if (route.includes(":")) return undefined;
  return join(outdir, route, "index.html");
}

/** Copies index.html to each static route, so a static host serves deep links. "/" is index.html already. */
export async function writeRouteIndexes(
  outdir: string,
  routes: Record<string, string>,
): Promise<void> {
  for (const route of Object.keys(routes)) {
    if (route === INDEX_ROUTE) continue;
    const target = staticRouteFile(outdir, route);
    if (target === undefined) continue;
    await mkdir(dirname(target), { recursive: true });
    await copyFile(join(outdir, "index.html"), target);
  }
}
