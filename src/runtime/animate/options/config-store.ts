import type { AnimateConfig } from "./config.ts";

// Kept apart from config.ts so the readers can import it without a cycle.
let configured: AnimateConfig = {};
let active: AnimateConfig | null = null;
const captured = new WeakMap<Element, AnimateConfig>();

// The config of the element being read: captured from its scope when it bound.
export function animateConfig(): AnimateConfig {
  return active ?? configured;
}

export function fileAnimateConfig(): AnimateConfig {
  return configured;
}

export function storeAnimateConfig(config: AnimateConfig): void {
  configured = config;
}

export function withAnimateConfig<T>(config: AnimateConfig, fn: () => T): T {
  const previous = active;
  active = config;
  try {
    return fn();
  } finally {
    active = previous;
  }
}

export function rememberAnimateConfig(el: Element, config: AnimateConfig): void {
  captured.set(el, config);
}

// Layout and space plays start outside the bind, so they look up what the element captured.
export function withElementConfig<T>(el: Element, fn: () => T): T {
  return withAnimateConfig(captured.get(el) ?? configured, fn);
}
