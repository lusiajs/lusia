import { afterEach, describe, expect, test } from "bun:test";
import type { Component } from "lusiajs";
import { lazyComponent, type LazyPrefetch } from "#runtime/dom/lazy/lazy.ts";
import { placementPrefetch } from "#runtime/dom/lazy/placement-prefetch.ts";
import type { Scope } from "#runtime/config/scope.ts";

import Counter from "../fixtures/Counter.lusia";
import Loading from "../fixtures/Loading.lusia";
import { host, resetMounts } from "../fixtures/mount.ts";

afterEach(resetMounts);

function deferredLoad(component: Component) {
  let resolve!: () => void;
  const ready = new Promise<void>((done) => (resolve = done));
  let calls = 0;
  const load = () => {
    calls++;
    return ready.then(() => ({ default: component }));
  };
  return { load, finish: () => resolve(), calls: () => calls };
}

function scopeWithPrefetch(prefetch: LazyPrefetch): Scope {
  return { own: { lazy: { prefetch } }, inherited: { lazy: { prefetch } } };
}

const flush = () => new Promise((done) => setTimeout(done, 0));
const waitForIdle = () => new Promise((done) => setTimeout(done, 50));

// Places the component the way a parent component's markup does, with a given scope.
function placeWithScope(component: Component, el: HTMLElement, scope?: Scope) {
  return component.place(el, null, { props: {}, bound: {}, scope, inherited: "" }, []);
}

describe("placementPrefetch", () => {
  test("uses the compiled value when no scope sets prefetch", () => {
    expect(placementPrefetch(undefined, "view")).toBe("view");
    expect(placementPrefetch(scopeWithPrefetch("none"), "view")).toBe("none");
  });

  test("a scope prefetch wins over the compiled value", () => {
    expect(placementPrefetch({ own: {}, inherited: {} }, "idle")).toBe("idle");
    expect(placementPrefetch(scopeWithPrefetch("idle"), "none")).toBe("idle");
  });
});

describe("lazy placement prefetch", () => {
  test("a scope prefetch of none loads at placement, even when compiled as view", async () => {
    const { load, calls } = deferredLoad(Counter);
    const el = host();
    placeWithScope(lazyComponent(load, Loading, "view"), el, scopeWithPrefetch("none"));

    expect(calls()).toBe(1);
    expect(el.querySelector("span")).toBeNull();
  });

  test("a scope prefetch of view waits for the sentinel, even when compiled as none", () => {
    const { load, calls } = deferredLoad(Counter);
    const el = host();
    placeWithScope(lazyComponent(load, Loading, "none"), el, scopeWithPrefetch("view"));

    expect(calls()).toBe(0);
    expect(el.querySelector("span")).not.toBeNull();
  });

  test("a scope prefetch of idle waits for idle time before loading", async () => {
    const { load, calls } = deferredLoad(Counter);
    const el = host();
    placeWithScope(lazyComponent(load, Loading, "view"), el, scopeWithPrefetch("idle"));

    expect(calls()).toBe(0);
    await waitForIdle();
    expect(calls()).toBe(1);
  });

  test("detaching before idle time places nothing and does not load", async () => {
    const { load, calls } = deferredLoad(Counter);
    const el = host();
    const removeAll = placeWithScope(
      lazyComponent(load, Loading, "none"),
      el,
      scopeWithPrefetch("idle"),
    );

    removeAll();
    await waitForIdle();

    expect(calls()).toBe(0);
    expect(el.children.length).toBe(0);
  });

  test("without a scope, the compiled idle value still loads at placement after idle", async () => {
    const { load, calls } = deferredLoad(Counter);
    const el = host();
    placeWithScope(lazyComponent(load, Loading, "idle"), el);
    await waitForIdle();

    expect(calls()).toBe(1);
  });
});
