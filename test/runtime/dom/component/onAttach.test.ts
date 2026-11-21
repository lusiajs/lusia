import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { onAttach, onDetach } from "lusiajs";
import AttachRoot from "../fixtures/AttachRoot.lusia";
import CallOnAttach from "../fixtures/CallOnAttach.lusia";
import DetachRoot from "../fixtures/DetachRoot.lusia";
import OnAttach from "../fixtures/OnAttach.lusia";
import OrderedAttach from "../fixtures/OrderedAttach.lusia";
import { events, roots } from "../fixtures/log.ts";
import { click, host, mount, resetMounts, unmount } from "../fixtures/mount.ts";

beforeEach(() => {
  events.length = 0;
  roots.length = 0;
});

afterEach(resetMounts);

describe("onAttach", () => {
  test("an onAttach call installs the hook and its cleanup", () => {
    const el = host();
    const instance = mount(CallOnAttach, el);
    const button = el.querySelector(".go")!;

    click(el, ".go");
    expect(events).toEqual(["click: 1-2"]);

    unmount(instance);
    button.dispatchEvent(new Event("click"));
    expect(events).toEqual(["click: 1-2"]);
  });

  test("the hook receives the parent element as root", () => {
    const el = host();
    mount(AttachRoot, el);

    expect(roots).toEqual([el]);
  });

  test("a function returned from onAttach runs on unmount, not before", () => {
    const el = host();
    const instance = mount(OnAttach, el);

    expect(events).toEqual(["attach"]);

    unmount(instance);

    expect(events).toEqual(["attach", "cleanup"]);
  });

  test("onDetach runs on unmount and receives the parent element as root", () => {
    const el = host();
    const instance = mount(DetachRoot, el);

    expect(roots).toEqual([]);

    unmount(instance);

    expect(roots).toEqual([el]);
  });

  test("several onAttach calls in one script run in call order", () => {
    mount(OrderedAttach);

    expect(events).toEqual(["first", "second", "third"]);
  });

  test("calling onAttach outside a component script throws runtime error L2070", () => {
    let thrown: unknown;
    try {
      onAttach(() => {});
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as { code?: string }).code).toBe("L2070");
  });

  test("calling onDetach outside a component script throws runtime error L2070", () => {
    expect(() => onDetach(() => {})).toThrow();
  });
});
