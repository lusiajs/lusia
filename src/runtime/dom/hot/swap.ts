import { replaceStyle } from "../component/styles.ts";
import type { HotComponent } from "./define.ts";
import { type Definition, type HotInstance, replaceRendering } from "./instance.ts";
import { renderInstance } from "./render.ts";
import { beginSwap, endSwap, type Snapshot, type Restore } from "./session.ts";
import { definitionOf, liveInstances, setDefinition } from "./registry.ts";

// On a render error the old instance stays; instances already swapped keep the new code.
export function swapComponent(component: HotComponent): void {
  const previous = definitionOf(component.id);
  setDefinition(component.id, component.definition);
  try {
    for (const instance of liveInstances(component.id)) {
      if (instance.alive) swapInstance(instance, component.definition);
    }
  } catch (error) {
    if (previous) setDefinition(component.id, previous);
    throw error;
  }
  replaceStyle(component.id, component.definition.css);
}

/** A change to the style only: the markup and script stay as they are. */
export function swapStyle(id: string, css: string): void {
  const previous = definitionOf(id);
  if (previous) setDefinition(id, { ...previous, css });
  replaceStyle(id, css);
}

function swapInstance(instance: HotInstance, definition: Definition): void {
  const [self, ...descendants] = snapshotTree(instance);
  beginSwap(descendants);
  instance.restore = self!.values;
  try {
    replaceRendering(instance, renderInstance(instance, definition));
  } finally {
    endSwap();
  }
}

function snapshotTree(instance: HotInstance, out: Snapshot[] = []): Snapshot[] {
  out.push({ id: instance.id, values: valuesOf(instance) });
  for (const child of instance.children) snapshotTree(child, out);
  return out;
}

function valuesOf(instance: HotInstance): Restore {
  const values: Restore = new Map();
  for (const [name, variable] of instance.variables) values.set(name, variable.peek());
  return values;
}
