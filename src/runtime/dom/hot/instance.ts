import type { Variable } from "../../variable/variable.ts";
import type { Cleanup } from "../template/bindings.ts";
import type { Host, Render } from "../component/component.ts";
import type { Leave } from "../component/leave.ts";
import { currentFrame, insertRendering, renderInstance, type Rendering } from "./render.ts";
import { type Restore, takeRestore } from "./session.ts";
import { untrackInstance, trackInstance } from "./registry.ts";
import { removeRegion, runCleanups } from "./teardown.ts";

export interface Definition {
  readonly css: string;
  readonly render: Render;
  readonly head?: Render;
}

/** One mounted component in the dev build. Its place in the page is the region from `start` to `end`. */
export interface HotInstance {
  readonly id: string;
  readonly host: Host;
  readonly owner: HotInstance | null;
  readonly children: Set<HotInstance>;
  /** The leave list this instance joined: its parent's, or the list of a root attach. */
  readonly parentLeaves: Leave[];
  leaveHook: Leave | null;
  start: Text;
  end: Text;
  cleanups: Cleanup[];
  variables: Map<string, Variable<unknown>>;
  /** Values to hand to the variables of the next render, set by a hot swap. */
  restore: Restore | null;
  alive: boolean;
}

export function createInstance(id: string, host: Host, parentLeaves: Leave[]): HotInstance {
  const owner = currentFrame()?.instance ?? null;
  const instance: HotInstance = {
    id,
    host,
    owner,
    children: new Set(),
    parentLeaves,
    leaveHook: null,
    start: document.createTextNode(""),
    end: document.createTextNode(""),
    cleanups: [],
    variables: new Map(),
    restore: takeRestore(id),
    alive: true,
  };
  owner?.children.add(instance);
  trackInstance(instance);
  return instance;
}

export function mountInstance(
  instance: HotInstance,
  definition: Definition,
  parent: Node,
  anchor: Node | null,
): void {
  try {
    const rendering = renderInstance(instance, definition);
    insertRendering(rendering, parent, anchor);
    adopt(instance, rendering);
    attachLeaves(instance, rendering.leaves);
  } catch (error) {
    forgetInstance(instance);
    throw error;
  }
}

/** Swaps the markup and script of a mounted instance. The old nodes stay until the new ones are in place. */
export function replaceRendering(instance: HotInstance, rendering: Rendering): void {
  const oldCleanups = instance.cleanups;
  const oldStart = instance.start;
  const oldEnd = instance.end;
  insertRendering(rendering, oldStart.parentNode!, oldStart);
  detachLeaves(instance);
  runCleanups(oldCleanups);
  removeRegion(oldStart, oldEnd);
  adopt(instance, rendering);
  attachLeaves(instance, rendering.leaves);
}

export function unmountInstance(instance: HotInstance): void {
  if (!instance.alive) return;
  forgetInstance(instance);
  detachLeaves(instance);
  runCleanups(instance.cleanups);
  removeRegion(instance.start, instance.end);
}

function adopt(instance: HotInstance, rendering: Rendering): void {
  instance.start = rendering.start;
  instance.end = rendering.end;
  instance.cleanups = rendering.cleanups;
  instance.variables = rendering.variables;
}

function forgetInstance(instance: HotInstance): void {
  instance.alive = false;
  instance.owner?.children.delete(instance);
  untrackInstance(instance);
}

function attachLeaves(instance: HotInstance, leaves: Leave[]): void {
  if (leaves.length === 0) return;
  const hook: Leave = async () => {
    await Promise.all(leaves.map((leave) => leave()));
  };
  instance.leaveHook = hook;
  instance.parentLeaves.push(hook);
}

function detachLeaves(instance: HotInstance): void {
  const hook = instance.leaveHook;
  if (!hook) return;
  const index = instance.parentLeaves.indexOf(hook);
  if (index !== -1) instance.parentLeaves.splice(index, 1);
  instance.leaveHook = null;
}
