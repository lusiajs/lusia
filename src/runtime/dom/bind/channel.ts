import { watch } from "../../variable/graph.ts";
import { isReactive } from "../../variable/reactive.ts";
import type { Variable } from "../../variable/variable.ts";
import { bindEvent, type Cleanup } from "../template/bindings.ts";
import { runtimeError, withWhere } from "../../errors.ts";

export interface Channel {
  prop: string;
  events: string[];
  toDom(value: unknown): unknown;
  fromDom(el: HTMLElement): unknown;
}

export function assertWritable(target: unknown, attr: string): asserts target is Variable<unknown> {
  const writable =
    isReactive(target) && Object.getOwnPropertyDescriptor(target, "value")?.set !== undefined;
  if (!writable) throw runtimeError("L2043", { attr });
}

/** The variable a component binds with bind-<prop>. Checked when the parent renders. */
export function writableTarget(target: unknown, attr: string, where?: string): Variable<unknown> {
  withWhere(where, () => assertWritable(target, attr));
  return target as Variable<unknown>;
}

function readProp(el: HTMLElement, prop: string): unknown {
  return (el as unknown as Record<string, unknown>)[prop];
}

function writeProp(el: HTMLElement, prop: string, value: unknown): void {
  (el as unknown as Record<string, unknown>)[prop] = value;
}

/** Variable to DOM in a watch, DOM to variable on the channel's events. Equal values are never written twice. */
export function bindChannel(
  el: HTMLElement,
  target: unknown,
  channel: Channel,
  attr: string,
  cleanups: Cleanup[],
): void {
  assertWritable(target, attr);
  const variable = target;
  cleanups.push(
    watch(() => {
      const next = channel.toDom(variable.value);
      if (!Object.is(readProp(el, channel.prop), next)) writeProp(el, channel.prop, next);
    }),
  );
  const pull = (): void => {
    const next = channel.fromDom(el);
    if (!Object.is(next, variable.peek())) variable.value = next;
  };
  for (const type of channel.events) bindEvent(el, type, pull, cleanups);
}
