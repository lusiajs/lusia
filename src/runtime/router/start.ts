import { attach } from "../dom/component/attach.ts";
import type { Component, Instance } from "../dom/component/component.ts";
import { findRoute } from "./find.ts";
import { pathState } from "./location.ts";
import { routeKeys } from "./params.ts";
import { followLinks } from "./links.ts";
import { scrollToHash } from "./scroll.ts";

export type RoutePages = Record<string, () => Promise<{ default: Component }>>;

/** Shows the page for the address in `target`. Pages load when first needed. Resolves after the first page is attached. */
export function startRoutes(pages: RoutePages, target: Element): Promise<void> {
  const keys = Object.keys(pages);
  routeKeys.set(keys);
  let current: Instance | undefined;
  let navigation = 0;

  async function detachCurrent(): Promise<void> {
    const old = current;
    current = undefined;
    await old?.detach();
  }

  async function show(path: string): Promise<void> {
    const id = ++navigation;
    const route = findRoute(keys, path);
    if (!route) {
      await detachCurrent();
      return;
    }
    const loaded = await pages[route.key]?.();
    if (id !== navigation || !loaded) return;
    await detachCurrent();
    if (id !== navigation) return;
    current = attach(loaded.default, target);
    scrollToHash();
  }

  followLinks();
  pathState.onUpdate((now) => void show(now), { onInit: false });
  return show(pathState.peek());
}
