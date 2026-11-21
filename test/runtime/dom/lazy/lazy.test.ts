import { afterEach, describe, expect, test } from "bun:test";
import { lazy, type Component } from "lusia";
import { lazyComponent } from "#runtime/dom/lazy/lazy.ts";

import Counter from "../fixtures/Counter.lusia";
import Loading from "../fixtures/Loading.lusia";
import { host, mount, resetMounts, text } from "../fixtures/mount.ts";

afterEach(resetMounts);

// A load that waits until the test resolves it, so the fallback can be seen.
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

const flush = () => new Promise((done) => setTimeout(done, 0));

describe("lazy", () => {
  test("shows the fallback until the component has loaded", async () => {
    const { load, finish } = deferredLoad(Counter);
    const el = host();
    mount(lazyComponent(load, Loading, "none"), el);

    expect(el.querySelector(".loading")).not.toBeNull();
    expect(el.querySelector(".counter")).toBeNull();

    finish();
    await flush();

    expect(el.querySelector(".loading")).toBeNull();
    expect(text(el, ".count")).toBe("0");
  });

  test("renders nothing before the load when there is no fallback", async () => {
    const { load, finish } = deferredLoad(Counter);
    const el = host();
    mount(lazyComponent(load, undefined, "none"), el);

    expect(el.children.length).toBe(0);

    finish();
    await flush();

    expect(el.querySelector(".counter")).not.toBeNull();
  });

  test("keeps its position among sibling nodes", async () => {
    const { load, finish } = deferredLoad(Counter);
    const el = host();
    el.append(document.createElement("hr"));
    mount(lazyComponent(load, Loading, "none"), el);
    el.append(document.createElement("footer"));

    finish();
    await flush();

    expect([...el.children].map((child) => child.tagName)).toEqual(["HR", "DIV", "FOOTER"]);
  });

  test("loads into the page when it was placed in a fragment that has since been emptied", async () => {
    const { load, finish } = deferredLoad(Counter);
    const el = host();
    const fragment = document.createDocumentFragment();
    mount(lazyComponent(load, Loading, "none"), fragment as unknown as HTMLElement);
    el.append(fragment);

    finish();
    await flush();

    expect(text(el, ".count")).toBe("0");
  });

  test("detaching before the load finishes places nothing", async () => {
    const { load, finish } = deferredLoad(Counter);
    const el = host();
    const instance = mount(lazyComponent(load, Loading, "none"), el);

    void instance.detach();
    finish();
    await flush();

    expect(el.children.length).toBe(0);
    expect(el.childNodes.length).toBe(0);
  });

  test("loads once and reuses the component for later placements", async () => {
    const { load, finish, calls } = deferredLoad(Counter);
    const Chart = lazyComponent(load, Loading, "none");
    const first = host();
    const second = host();
    mount(Chart, first);
    finish();
    await flush();
    mount(Chart, second);

    expect(calls()).toBe(1);
    expect(second.querySelector(".loading")).toBeNull();
    expect(second.querySelector(".counter")).not.toBeNull();
  });

  test("a failed load is reported as a LusiaError and the fallback stays", async () => {
    const reported: unknown[] = [];
    const original = globalThis.reportError;
    globalThis.reportError = (error: unknown) => {
      reported.push(error);
    };
    try {
      const el = host();
      mount(
        lazyComponent(() => Promise.reject(new Error("no file")), Loading, "none"),
        el,
      );
      await flush();

      const [error] = reported as Error[];
      expect(error?.name).toBe("LusiaError");
      expect(error?.message).toBe("lazy component failed to load: no file");
      expect(el.querySelector(".loading")).not.toBeNull();
    } finally {
      globalThis.reportError = original;
    }
  });

  test("lazy() is removed, and calling it says to import the component instead", () => {
    expect(() => lazy()).toThrow("lazy() was removed");
  });
});
