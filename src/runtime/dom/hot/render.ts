import type { Variable } from "../../variable/variable.ts";
import type { Cleanup } from "../template/bindings.ts";
import { renderWith, type Rendered } from "../component/component.ts";
import { runAttach, type AttachHook } from "../component/lifecycle.ts";
import type { Leave } from "../component/leave.ts";
import { injectStyle } from "../component/styles.ts";
import { attachHead } from "../component/head.ts";
import type { Definition, HotInstance } from "./instance.ts";
import { removeRegion, runCleanups } from "./teardown.ts";

/** A render that has run but is not in the page yet. */
export interface Rendering {
  readonly fragment: DocumentFragment;
  readonly attachHooks: AttachHook[];
  readonly start: Text;
  readonly end: Text;
  readonly cleanups: Cleanup[];
  readonly leaves: Leave[];
  readonly variables: Map<string, Variable<unknown>>;
}

export interface Frame {
  readonly instance: HotInstance;
  readonly variables: Map<string, Variable<unknown>>;
}

let frame: Frame | null = null;

export function currentFrame(): Frame | null {
  return frame;
}

function emptyText(): Text {
  return document.createTextNode("");
}

/** Runs the script and markup of one instance. Nothing is inserted; a failed render cleans up after itself. */
export function renderInstance(instance: HotInstance, definition: Definition): Rendering {
  injectStyle(instance.id, definition.css);
  const cleanups: Cleanup[] = [];
  const leaves: Leave[] = [];
  const variables = new Map<string, Variable<unknown>>();
  const previous = frame;
  frame = { instance, variables };
  try {
    const rendered: Rendered = renderWith(definition.render, instance.host, cleanups, leaves);
    attachHead(definition.head, instance.host, cleanups, leaves);
    const start = emptyText();
    const end = emptyText();
    rendered.fragment.prepend(start);
    rendered.fragment.append(end);
    return {
      fragment: rendered.fragment,
      attachHooks: rendered.attachHooks,
      start,
      end,
      cleanups,
      leaves,
      variables,
    };
  } catch (error) {
    runCleanups(cleanups);
    throw error;
  } finally {
    frame = previous;
  }
}

// A throwing attach hook discards the rendering.
export function insertRendering(rendering: Rendering, parent: Node, anchor: Node | null): void {
  parent.insertBefore(rendering.fragment, anchor);
  try {
    runAttach(rendering.attachHooks, parent, rendering.cleanups);
  } catch (error) {
    discardRendering(rendering);
    throw error;
  }
}

function discardRendering(rendering: Rendering): void {
  runCleanups(rendering.cleanups);
  removeRegion(rendering.start, rendering.end);
}
