import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { EVENT, keepRunning, listen } from "lusiajs";
import ListenWindow from "./fixtures/ListenWindow.lusia";
import { events } from "./fixtures/listen-log.ts";
import { host, mount, resetMounts, unmount } from "../dom/fixtures/mount.ts";
import { advance, useFakeClock } from "../animate/clock.ts";

useFakeClock();

const PING = "lusia-ping";
const stops: Array<() => void> = [];

function ping(target: EventTarget = window): void {
  target.dispatchEvent(new Event(PING));
}

beforeEach(() => {
  events.length = 0;
});

afterEach(() => {
  resetMounts();
  stops.splice(0).forEach((stop) => stop());
});

describe("listen", () => {
  test("a DOM event calls fn until stop", () => {
    const stop = listen(window, PING, () => events.push("ping"));
    ping();
    stop();
    ping();
    expect(events).toEqual(["ping"]);
  });

  test("an array of targets returns one stop per target", () => {
    const a = document.createElement("div");
    const b = document.createElement("div");
    const result = listen([a, b], PING, () => events.push("ping"));
    expect(result).toHaveLength(2);
    result[0]!();
    ping(a);
    ping(b);
    expect(events).toEqual(["ping"]);
    result[1]!();
  });

  test("a DOM scroll listener is called once on the next frame, with a scroll event", () => {
    stops.push(listen(window, "scroll", (event) => events.push(event.type)));
    expect(events).toEqual([]);
    advance(16);
    expect(events).toEqual(["scroll"]);
  });

  test("a DOM scroll listener is not called after stop", () => {
    const stop = listen(window, "scroll", () => events.push("scroll"));
    stop();
    advance(16);
    expect(events).toEqual([]);
  });

  test("a DOM scroll listener on a detached element is not called", () => {
    const detached = document.createElement("div");
    stops.push(listen(detached, "scroll", () => events.push("scroll")));
    advance(16);
    expect(events).toEqual([]);
  });

  test("other DOM events are not called on start", () => {
    stops.push(listen(window, PING, () => events.push("ping")));
    advance(16);
    expect(events).toEqual([]);
  });

  test("stop can be called twice", () => {
    const stop = listen(window, PING, () => events.push("ping"));
    stop();
    expect(() => stop()).not.toThrow();
  });

  test("in a component it stops on detach, except inside keepRunning", () => {
    const instance = mount(ListenWindow, host());
    const componentPing = () => window.dispatchEvent(new Event("lusia-component-ping"));
    componentPing();
    expect(events.sort()).toEqual(["attach", "kept", "setup"]);
    events.length = 0;
    unmount(instance);
    componentPing();
    expect(events).toEqual(["kept"]);
  });

  test("keepRunning outside a component changes nothing", () => {
    keepRunning(() => {
      stops.push(listen(window, PING, () => events.push("ping")));
    });
    ping();
    expect(events).toEqual(["ping"]);
  });

  test("EVENT.CLICK_OUTSIDE fires on a press outside and on Escape, not inside", () => {
    const box = host();
    const inside = box.appendChild(document.createElement("button"));
    stops.push(listen(box, EVENT.CLICK_OUTSIDE, (event) => events.push(event.type)));
    inside.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "a" }));
    expect(events).toEqual(["pointerdown", "keydown"]);
  });

  test("EVENT values need an element", () => {
    expect(() => listen(window, EVENT.VIEW, () => {})).toThrow(
      "EVENT.VIEW needs an element, not window or document",
    );
  });

  test("an unknown event is an error", () => {
    expect(() => listen(window, Symbol("x") as never, () => {})).toThrow("unknown event");
  });
});
