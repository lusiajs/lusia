import { runtimeError } from "../../errors.ts";
import { variable } from "../../variable/variable.ts";
import type { Variable } from "../../variable/variable.ts";
import { REACTIVE } from "../../variable/reactive.ts";
import { currentComponentHost, type Host } from "./component.ts";

/** A prop as the component sees it. Writing it sets the parent's variable when the parent bound it. */
export interface Prop<T> {
  value: T;
  get(): T;
  set(next: T): void;
  peek(): T;
  readonly [REACTIVE]: true;
}

function readOnlyProp<T>(key: string, read: (() => unknown) | undefined, fallback: T): Prop<T> {
  const computed = variable.compute(() => read?.() ?? fallback);
  const reject = (): never => {
    throw runtimeError("L2058", { prop: key });
  };
  return {
    get value() {
      return computed.value as T;
    },
    set value(_next: T) {
      reject();
    },
    get: () => computed.get() as T,
    set: reject,
    peek: () => computed.peek() as T,
    [REACTIVE]: true,
  };
}

function boundProp<T>(target: Variable<unknown>, fallback: T): Prop<T> {
  const current = (): T => (target.value ?? fallback) as T;
  const write = (next: T): void => {
    target.value = next;
  };
  return {
    get value() {
      return current();
    },
    set value(next: T) {
      write(next);
    },
    get: current,
    set: write,
    peek: () => (target.peek() ?? fallback) as T,
    [REACTIVE]: true,
  };
}

function propFor<T>(host: Host, key: string, fallback: T): Prop<T> {
  const target = host.bound[key];
  return target ? boundProp(target, fallback) : readOnlyProp(key, host.props[key], fallback);
}

const targets = new WeakMap<object, Record<string, Prop<unknown>>>();

/** The prop behind `props.name`, for `bind-x={props.name}`. */
export function propTarget(declared: object, key: string): Prop<unknown> | undefined {
  return targets.get(declared)?.[key];
}

// A passed value is read-only unless the parent binds it with bind-<prop>.
export function props<C extends new () => object>(
  Declared: C,
  keys: readonly string[] = Object.keys(new Declared()),
): InstanceType<C> {
  const host = currentComponentHost();
  const defaults = new Declared() as Record<string, unknown>;
  const variables = {};
  const byKey: Record<string, Prop<unknown>> = {};
  targets.set(variables, byKey);
  for (const key of keys) {
    const prop = propFor(host, key, defaults[key]);
    byKey[key] = prop;
    Object.defineProperty(variables, key, {
      get: () => prop.value,
      set: (next: unknown) => {
        prop.value = next;
      },
      enumerable: true,
    });
  }
  return variables as InstanceType<C>;
}
