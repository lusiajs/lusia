import type { RoutePages } from "#bun-plugin/start.ts";
import { resolve } from "node:path";
import { entryPath } from "./bundle.ts";

export function routePages(dir: string, routes: Record<string, string>): RoutePages | undefined {
  if (Object.keys(routes).length === 0) return undefined;
  const root = resolve(dir);
  const pages = Object.entries(routes).map(([route, file]) => [route, resolve(root, file)]);
  return { entry: entryPath(root), pages: Object.fromEntries(pages) };
}
