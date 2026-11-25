import type { Cleanup } from "../template/bindings.ts";
import {
  componentFrom,
  type Component,
  type ComponentOptions,
  type Host,
  type Render,
} from "../component/component.ts";
import type { Leave } from "../component/leave.ts";
import { isServerRender } from "../../ssr/flag.ts";
import { placeSkipped } from "../../ssr/skip.ts";
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
    if (options.noSsr && isServerRender()) {
      return placeSkipped(options.fallback, parent, anchor, host, leaves);
    }
    const instance = mountComponent(id, host, leaves, parent, anchor);
    return () => unmountInstance(instance);
  };

  return Object.assign(componentFrom(place), { id, definition });
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
