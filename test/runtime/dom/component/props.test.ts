import { afterEach, describe, expect, test } from "bun:test";
import { props } from "#runtime/dom/component/props.ts";
import { variable } from "#runtime/variable/variable.ts";
import Badge from "../fixtures/badge.lusia";
import Shelf from "../fixtures/Shelf.lusia";
import { host, mount, resetMounts, text } from "../fixtures/mount.ts";

afterEach(resetMounts);

describe("props", () => {
  test("throws when called outside a component's script", () => {
    expect(() => props(class {}, [])).toThrow(
      "props() can only be called in a component's <script>",
    );
  });

  test("defaults apply when nothing is passed", () => {
    const el = host();
    mount(Badge, el);
    const badge = el.querySelector(".badge")!;

    expect(badge.textContent).toBe("New");
    expect(badge.classList.contains("info")).toBe(true);
    expect(badge.hasAttribute("data-flag")).toBe(false);
  });

  test("a passed value replaces the default", () => {
    const el = host();
    mount(Badge, el, { label: () => "Custom", tone: () => "warn" });
    const badge = el.querySelector(".badge")!;

    expect(badge.textContent).toBe("Custom");
    expect(badge.classList.contains("warn")).toBe(true);
  });

  test("a null or undefined value falls back to the default", () => {
    const el = host();
    mount(Badge, el, { label: () => null, tone: () => undefined });
    const badge = el.querySelector(".badge")!;

    expect(badge.textContent).toBe("New");
    expect(badge.classList.contains("info")).toBe(true);
  });

  test("a bare attribute passes true", () => {
    const el = host();
    mount(Shelf, el, { label: () => "Inbox" });
    const [flagged, plain] = el.querySelectorAll(".badge");

    expect(flagged!.getAttribute("data-flag")).toBe("");
    expect(plain!.hasAttribute("data-flag")).toBe(false);
  });

  test("a passed value stays reactive", () => {
    const label = variable("A");
    const el = host();
    mount(Badge, el, { label: () => label.value });

    label.value = "B";

    expect(text(el, ".badge")).toBe("B");
  });
});
