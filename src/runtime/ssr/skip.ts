import type { Cleanup } from "../dom/template/bindings.ts";
import type { Component, Host } from "../dom/component/component.ts";
import type { Leave } from "../dom/component/leave.ts";

const noop: Cleanup = () => {};

/** On the server, a <NO_SSR /> component renders its fallback, or nothing. */
export function placeSkipped(
  fallback: Component | undefined,
  parent: Node,
  anchor: Node | null,
  host: Host,
  leaves: Leave[],
): Cleanup {
  if (!fallback) return noop;
  return fallback.place(
    parent,
    anchor,
    { props: {}, bound: {}, scope: host.scope, inherited: host.inherited },
    leaves,
  );
}
