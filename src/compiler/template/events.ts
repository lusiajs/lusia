import { hasExpression } from "./scan/attributes.ts";
import type { AttrBinding } from "./types/attribute.ts";

const EVENT_NAME = /^on:?[a-z][a-z-]*$/;
const LISTEN_PREFIX = "on:";

export function isEventName(name: string): boolean {
  return EVENT_NAME.test(name);
}

/** `onclick={fn}` on an element is a listener. A static `onclick="..."` stays plain HTML. */
export function isEventAttr(attr: AttrBinding): boolean {
  return isEventName(attr.name) && hasExpression(attr.parts);
}

/** `on:name={fn}` goes through listen(), so it also takes the EVENT names: view, scroll, size, outside. */
export function isListenName(name: string): boolean {
  return name.startsWith(LISTEN_PREFIX);
}

export function eventType(name: string): string {
  return isListenName(name) ? name.slice(LISTEN_PREFIX.length) : name.slice("on".length);
}
