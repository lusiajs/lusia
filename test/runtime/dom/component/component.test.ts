import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { variable } from "#runtime/variable/variable.ts";
import Counter from "../fixtures/Counter.lusia";
import OnAttach from "../fixtures/OnAttach.lusia";
import Shelf from "../fixtures/Shelf.lusia";
import { events } from "../fixtures/log.ts";
import { host, mount, resetMounts, text, unmount, click } from "../fixtures/mount.ts";

beforeEach(() => {
  events.length = 0;
});

afterEach(resetMounts);

describe("component instances", () => {
  test("each instance has its own state", () => {
    const first = host();
    const second = host();
    mount(Counter, first);
    mount(Counter, second);

    click(first, ".inc");
    click(first, ".inc");

    expect(text(first, ".count")).toBe("2");
    expect(text(second, ".count")).toBe("0");
  });

  test("a parent variable updates the child's props", () => {
    const label = variable("First");
    const el = host();
    mount(Shelf, el, { label: () => label.value });
    const [firstBadge] = el.querySelectorAll(".badge");

    expect(text(el, ".title")).toBe("First");
    expect(firstBadge!.textContent).toBe("First");

    label.value = "Second";

    expect(text(el, ".title")).toBe("Second");
    expect(firstBadge!.textContent).toBe("Second");
  });

  test("detaching a parent removes nested child nodes and stops their watchers", () => {
    const label = variable("First");
    const el = host();
    const instance = mount(Shelf, el, { label: () => label.value });
    const childBadge = el.querySelector(".badge")!;

    unmount(instance);
    label.value = "Second";

    expect(el.childNodes.length).toBe(0);
    expect(childBadge.isConnected).toBe(false);
    expect(childBadge.textContent).toBe("First");
  });

  test("onAttach runs after the nodes are placed, and its returned cleanup runs on detach", () => {
    const el = host();
    const instance = mount(OnAttach, el);

    expect(events).toEqual(["attach"]);

    unmount(instance);

    expect(events).toEqual(["attach", "cleanup"]);
  });
});
