import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { defineComponent, type Render } from "#runtime/dom/component/component.ts";
import { variable } from "#runtime/variable/variable.ts";
import { attach } from "lusiajs";
import HeadPage from "../fixtures/HeadPage.lusia";
import { host, mount, resetMounts, unmount } from "../fixtures/mount.ts";

function meta(name: string): string | null {
  return document.head.querySelector(`meta[name="${name}"]`)?.getAttribute("content") ?? null;
}

function keywordsCount(): number {
  return document.head.querySelectorAll('meta[name="keywords"]').length;
}

beforeEach(() => {
  document.head.innerHTML =
    '<title>Original</title><meta name="description" content="Site description" />';
});

afterEach(() => {
  resetMounts();
  document.head.innerHTML = "";
});

describe("<head> in a component", () => {
  test("the title replaces the page title and comes back on detach", () => {
    const title = variable("Home");
    const el = host();
    const instance = mount(HeadPage, el, { title: () => title.value });

    expect(document.title).toBe("Home");

    unmount(instance);

    expect(document.title).toBe("Original");
  });

  test("a title expression follows its variable", () => {
    const title = variable("Home");
    const el = host();
    mount(HeadPage, el, { title: () => title.value });

    title.value = "About";

    expect(document.title).toBe("About");
  });

  test("a meta with the same name replaces the page's meta and restores it on detach", () => {
    const el = host();
    const instance = mount(HeadPage, el, { title: () => "T" });

    expect(meta("description")).toBe("Component description");

    unmount(instance);

    expect(meta("description")).toBe("Site description");
  });

  test("a meta with a new name is appended and removed on detach", () => {
    const el = host();
    const instance = mount(HeadPage, el, { title: () => "T" });

    expect(keywordsCount()).toBe(1);

    unmount(instance);

    expect(keywordsCount()).toBe(0);
  });

  test("the component's markup is still placed in the page", () => {
    const el = host();
    mount(HeadPage, el, { title: () => "T" });

    expect(el.querySelector(".body")!.textContent).toBe("Page");
    expect(el.querySelector("title")).toBeNull();
  });
});

describe("defineComponent head option", () => {
  test("a component compiled without the dev build places and removes its head", () => {
    const render: Render = (_cleanups, _leaves, componentHost) => {
      componentHost.head = fragmentOf('<title>Plain</title><meta name="author" content="Team" />');
      return document.createDocumentFragment();
    };
    const Plain = defineComponent("head-test-plain", "", render, {
      head: (_cleanups, _leaves, componentHost) => componentHost.head!,
    });
    const el = host();
    const instance = attach(Plain, el);

    expect(document.title).toBe("Plain");
    expect(meta("author")).toBe("Team");

    instance.detach();

    expect(document.title).toBe("Original");
    expect(meta("author")).toBeNull();
  });
});

function fragmentOf(html: string): DocumentFragment {
  const template = document.createElement("template");
  template.innerHTML = html;
  return template.content;
}
