import { existsSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { asObject, configError, isRoute, type JsonObject } from "./config-values.ts";

const OLD_FORM =
  '"routes" is now a map of path to page file, such as { "/guide": "src/pages/Guide.lusia" }';

export function optionalRoutes(root: JsonObject): Record<string, string> | undefined {
  if (root.routes === undefined) return undefined;
  const routes = asObject(root.routes, OLD_FORM);
  const pages: Record<string, string> = {};
  for (const [path, file] of Object.entries(routes)) {
    if (!isRoutePath(path))
      throw configError(
        `invalid route "${path}", use a path such as /guide, /user/:id, or * for the 404 page`,
      );
    if (!isPageFile(file))
      throw configError(
        `route "${path}" must point to a .lusia file inside the app folder, such as src/pages/Guide.lusia`,
      );
    pages[path] = file;
  }
  return pages;
}

export function checkRouteFiles(routes: Record<string, string> | undefined, dir: string): void {
  for (const [path, file] of Object.entries(routes ?? {})) {
    if (!existsSync(join(dir, file)))
      throw configError(`route "${path}" points to a file that does not exist: ${file}`);
  }
}

function isRoutePath(path: string): boolean {
  if (path === "*") return true;
  return isRoute(path) && path.split("/").every(isRouteSegment);
}

function isRouteSegment(segment: string): boolean {
  return !segment.includes(":") || /^:\w+$/.test(segment);
}

function isPageFile(file: unknown): file is string {
  if (typeof file !== "string" || !file.endsWith(".lusia") || isAbsolute(file)) return false;
  return !file.split(/[\\/]/).includes("..");
}
