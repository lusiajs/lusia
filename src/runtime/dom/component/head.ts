import type { Cleanup } from "../template/bindings.ts";
import type { Host, Render } from "./component.ts";
import type { Leave } from "./leave.ts";

interface Slot {
  /** The element that was in the head before any component placed one. */
  original: Element | null;
  /** Elements placed for this key, in order. The last one is the one on the page. */
  placed: Element[];
}

// Keyed elements share a slot, so a later component's element can cover an earlier one and restore it.
const slots = new Map<string, Slot>();

/** Places the head of the component that is rendering. Its cleanup puts the page back. */
export function attachHead(
  head: Render | undefined,
  host: Host,
  cleanups: Cleanup[],
  leaves: Leave[],
): void {
  if (!head) return;
  cleanups.push(placeAll(head(cleanups, leaves, host)));
}

function placeAll(fragment: DocumentFragment): Cleanup {
  const unplaces = [...fragment.children].map(placeElement);
  return () => {
    for (const unplace of unplaces) unplace();
  };
}

function placeElement(element: Element): Cleanup {
  const key = keyOf(element);
  if (key === null) {
    document.head.append(element);
    return () => element.remove();
  }
  return placeKeyed(key, element);
}

function placeKeyed(key: string, element: Element): Cleanup {
  let slot = slots.get(key);
  if (!slot) {
    slot = { original: findInHead(key), placed: [] };
    slots.set(key, slot);
  }
  const shown = slot.placed.at(-1) ?? slot.original;
  if (shown) shown.replaceWith(element);
  else document.head.append(element);
  slot.placed.push(element);
  return () => unplaceKeyed(key, slot, element);
}

function unplaceKeyed(key: string, slot: Slot, element: Element): void {
  const index = slot.placed.indexOf(element);
  if (index === -1) return;
  const wasShown = index === slot.placed.length - 1;
  slot.placed.splice(index, 1);
  if (wasShown) {
    const next = slot.placed.at(-1) ?? slot.original;
    if (next) element.replaceWith(next);
    else element.remove();
  }
  if (slot.placed.length === 0) slots.delete(key);
}

/** The key that makes an element replace another: title, canonical link, or a meta by name or property. */
function keyOf(element: Element): string | null {
  if (element.localName === "title") return "title";
  if (element.localName === "link" && element.getAttribute("rel") === "canonical") {
    return "canonical";
  }
  if (element.localName !== "meta") return null;
  const name = element.getAttribute("name");
  if (name !== null) return `name:${name}`;
  const property = element.getAttribute("property");
  return property === null ? null : `property:${property}`;
}

function findInHead(key: string): Element | null {
  return [...document.head.children].find((child) => keyOf(child) === key) ?? null;
}
