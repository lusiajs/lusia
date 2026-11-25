import type { Cleanup } from "../template/bindings.ts";
import type {
  Component,
  ComponentOptions,
  Host,
  Instance,
  Props,
  Render,
} from "../component/component.ts";
import { treeClassesOf } from "../template/classes.ts";
import { leaveThen, type Leave } from "../component/leave.ts";
import {
  createInstance,
  mountInstance,
  unmountInstance,
  type Definition,
  type HotInstance,
} from "./instance.ts";
import { definitionOf, setDefinition } from "./registry.ts";

export interface HotComponent extends Component {
  readonly id: string;
  readonly definition: Definition;
}

// Instances look up the latest definition by id, so hot swaps reach old imports.
export function hotComponent(
  id: string,
  css: string,
  render: Render,
  options: ComponentOptions = {},
): HotComponent {
  const definition: Definition = { css, render, head: options.head };
  if (!definitionOf(id)) setDefinition(id, definition);

  const place = (parent: Node, anchor: Node | null, host: Host, leaves: Leave[]): Cleanup => {
    const instance = mountComponent(id, host, leaves, parent, anchor);
    return () => unmountInstance(instance);
  };

  const component = (target: Element, props: Props = {}): Instance => {
    const leaves: Leave[] = [];
    const inherited = treeClassesOf(target);
    const instance = mountComponent(id, { props, bound: {}, inherited }, leaves, target, null);
    return { root: target, detach: () => leaveThen(leaves, () => unmountInstance(instance)) };
  };

  return Object.assign(component, { id, definition, place });
}

function mountComponent(
  id: string,
  host: Host,
  parentLeaves: Leave[],
  parent: Node,
  anchor: Node | null,
): HotInstance {
  const instance = createInstance(id, host, parentLeaves);
  mountInstance(instance, definitionOf(id)!, parent, anchor);
  return instance;
}
