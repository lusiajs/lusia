import type { AnimateConfig } from "../animate/options/config.ts";
import type { LazyPrefetch } from "../dom/lazy/lazy.ts";

export interface RuntimeConfig {
  animate?: AnimateConfig;
  lazy?: { prefetch?: LazyPrefetch };
}

// `own` is what this component's markup binds with (TREE and SCOPED layers);
// `inherited` is what its child components start from (TREE layers only).
export interface Scope {
  readonly own: RuntimeConfig;
  readonly inherited: RuntimeConfig;
}

export const APP_SCOPE: Scope = Object.freeze({ own: {}, inherited: {} });

let current: Scope | null = null;

export function renderingScope(): Scope | null {
  return current;
}

export function currentScope(): Scope {
  return current ?? APP_SCOPE;
}

export function inScope<T>(scope: Scope, fn: () => T): T {
  const previous = current;
  current = scope;
  try {
    return fn();
  } finally {
    current = previous;
  }
}

export function childScope(parent: Scope | undefined): Scope {
  const base = parent?.inherited ?? {};
  return { own: base, inherited: base };
}

// Blocks render again later, outside the component's render, so they keep the scope they were made in.
export function keepScope<A extends unknown[], R>(render: (...args: A) => R): (...args: A) => R {
  const scope = currentScope();
  return (...args) => inScope(scope, () => render(...args));
}

export function replaceRenderingScope(next: Scope): void {
  current = next;
}
