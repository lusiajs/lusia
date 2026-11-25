import { attach } from "../dom/component/attach.ts";
import type { Component, Instance } from "../dom/component/component.ts";

/** A page built on the server is in the target. Its replacement is swapped in at once, so the two never show together. */
export function attachPage(component: Component, target: Element): Instance {
  if (target.childNodes.length === 0 || !document.documentElement.hasAttribute("data-lusia-ssr")) {
    return attach(component, target);
  }
  const staging = document.createElement("div");
  const instance = attach(component, staging);
  target.replaceChildren(...staging.childNodes);
  return { root: target, detach: instance.detach };
}
