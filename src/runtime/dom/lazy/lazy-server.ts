import type { Cleanup } from "../template/bindings.ts";
import type { Component, Host } from "../component/component.ts";
import type { Leave } from "../component/leave.ts";
import { holdRender } from "../../ssr/hold.ts";

const noop: Cleanup = () => {};

/** On the server a lazy component loads at once, with no fallback, so the page is complete. */
export function placeServerLoad(
  fetch: () => Promise<Component>,
  parent: Node,
  anchor: Node | null,
  host: Host,
  leaves: Leave[],
): Cleanup {
  const marker = document.createComment("");
  parent.insertBefore(marker, anchor);
  let removeLoaded: Cleanup = noop;
  let detached = false;
  holdRender(
    fetch().then((component) => {
      if (!detached) removeLoaded = component.place(marker.parentNode!, marker, host, leaves);
    }),
  );
  return () => {
    detached = true;
    removeLoaded();
    marker.remove();
  };
}
