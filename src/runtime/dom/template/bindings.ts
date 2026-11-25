import { batch, watch } from "../../variable/graph.ts";
import type { Leave } from "../component/leave.ts";

export type Cleanup = () => void;

export type Binder = (node: Node, cleanups: Cleanup[], leaves: Leave[]) => void;

export function toText(value: unknown): string {
  return value == null || value === false ? "" : String(value);
}

export function bindText(marker: Node, read: () => unknown, cleanups: Cleanup[]): void {
  const node = document.createTextNode("");
  (marker as ChildNode).replaceWith(node);
  cleanups.push(watch(() => (node.data = toText(read()))));
}

/** Keep an element's text in sync with `read()`. A textarea also gets it as its value. */
export function bindTextContent(el: Element, read: () => unknown, cleanups: Cleanup[]): void {
  cleanups.push(
    watch(() => {
      const text = toText(read());
      el.textContent = text;
      if (el instanceof HTMLTextAreaElement) el.value = text;
    }),
  );
}

/** Keep an attribute in sync with `read()`; null/false removes it. */
export function attr(el: Element, name: string, read: () => unknown, cleanups: Cleanup[]): void {
  cleanups.push(
    watch(() => {
      const value = read();
      if (value == null || value === false) el.removeAttribute(name);
      else el.setAttribute(name, value === true ? "" : String(value));
    }),
  );
}

/** The handler's variable writes run as one batch, so dependent watchers run once per event. */
function batched(handler: EventListener): EventListener {
  return (event) => batch(() => handler(event));
}

export function bindEvent(
  el: EventTarget,
  type: string,
  handler: EventListener,
  cleanups: Cleanup[],
): void {
  const listener = batched(handler);
  el.addEventListener(type, listener);
  cleanups.push(() => el.removeEventListener(type, listener));
}

export function insert(parent: Node, node: Node, anchor: Node | null = null): void {
  parent.insertBefore(node, anchor);
}
