import type { Cleanup } from "../template/bindings.ts";
import { componentFrom, type Component, type Host, type Place } from "../component/component.ts";
import type { Leave } from "../component/leave.ts";
import { runtimeError } from "../../errors.ts";
import { memoizeLoad, whenIdle, whenNear, type LazyLoad } from "./lazy-load.ts";
import { placementPrefetch } from "./placement-prefetch.ts";

export type { LazyLoad } from "./lazy-load.ts";
export type LazyPrefetch = "idle" | "view" | "none";

interface Loader {
  fetch: () => Promise<Component>;
  fallback: Component | undefined;
  prefetch: LazyPrefetch;
  remember: (component: Component) => void;
}

const noop: Cleanup = () => {};

// The compiler makes this for an imported component split into its own file.
export function lazyComponent(
  load: LazyLoad,
  fallback: Component | undefined,
  prefetch: LazyPrefetch,
): Component {
  const fetch = memoizeLoad(load);
  let loaded: Component | undefined;
  const loader: Loader = {
    fetch,
    fallback,
    prefetch,
    remember: (component) => {
      loaded = component;
    },
  };
  if (prefetch === "idle") whenIdle(() => void fetch().catch(() => {}));
  const place: Place = (parent, anchor, host, leaves) => {
    if (loaded) return loaded.place(parent, anchor, host, leaves);
    return placeLoading(loader, parent, anchor, host, leaves);
  };
  return componentFrom(place);
}

/** Removed in favor of imports. Calling it tells the author what to do instead. */
export function lazy(): never {
  throw runtimeError("L2059");
}

function placeLoading(
  loader: Loader,
  parent: Node,
  anchor: Node | null,
  host: Host,
  leaves: Leave[],
): Cleanup {
  // The marker keeps the position while the fallback and then the component come and go.
  const marker = document.createComment("");
  parent.insertBefore(marker, anchor);
  let removeFallback: Cleanup = loader.fallback
    ? loader.fallback.place(parent, marker, { props: {}, bound: {}, scope: host.scope }, [])
    : noop;
  let removeLoaded: Cleanup = noop;
  let detached = false;
  let sentinel: Element | undefined;
  let stopWatch: Cleanup = noop;

  const show = () => {
    sentinel?.remove();
    sentinel = undefined;
    loader.fetch().then(
      (component) => {
        loader.remember(component);
        if (detached) return;
        removeFallback();
        removeFallback = noop;
        // The parent may have changed since placement: it can be a fragment that was already emptied.
        removeLoaded = component.place(marker.parentNode!, marker, host, leaves);
      },
      (error: unknown) => {
        reportError(runtimeError("L2057", { message: messageOf(error) }));
      },
    );
  };

  const prefetch = placementPrefetch(host.scope, loader.prefetch);
  if (prefetch === "view" && loader.fallback) {
    // The import waits until the sentinel is near the screen.
    sentinel = document.createElement("span");
    parent.insertBefore(sentinel, marker);
    stopWatch = whenNear(sentinel, show);
  } else if (prefetch === "idle") {
    whenIdle(() => {
      if (!detached) show();
    });
  } else {
    show();
  }

  return () => {
    detached = true;
    stopWatch();
    sentinel?.remove();
    removeFallback();
    removeLoaded();
    marker.remove();
  };
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
