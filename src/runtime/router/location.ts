import { variable } from "../variable/variable.ts";
import { scrollToHash } from "./scroll.ts";

function readAddress(): { path: string; search: string } {
  if (typeof location === "undefined") return { path: "/", search: "" };
  return { path: location.pathname, search: location.search };
}

const start = readAddress();
export const pathState = variable(start.path);
export const searchState = variable(start.search);

/** Copies the address bar into the variables. Returns false when the path and query did not change. */
export function syncFromLocation(): boolean {
  const { path, search } = readAddress();
  const changed = pathState.peek() !== path || searchState.peek() !== search;
  pathState.set(path);
  searchState.set(search);
  return changed;
}

/** Moves to a URL. A new path or query updates the variables, which swaps the page in startRoutes. */
export function goTo(target: string): void {
  const url = new URL(target, location.href);
  const address = url.pathname + url.search + url.hash;
  if (address !== location.pathname + location.search + location.hash) {
    history.pushState(null, "", address);
  }
  if (!syncFromLocation()) scrollToHash();
}

if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    if (!syncFromLocation()) scrollToHash();
  });
}
