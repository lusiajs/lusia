import { describe, expect, test } from "bun:test";
import { attr, bindText, bindEvent } from "#runtime/dom/template/bindings.ts";
import { TEXT_MARKER } from "#runtime/markers.ts";
import { watch } from "#runtime/variable/graph.ts";
import { variable } from "#runtime/variable/variable.ts";

describe("bindText", () => {
  test("replaces the marker and updates when the variable changes", () => {
    const count = variable(0);
    const cleanups: Array<() => void> = [];
    const parent = document.createElement("p");
    const marker = document.createComment(TEXT_MARKER);
    parent.append(marker);
    bindText(marker, () => count.value, cleanups);
    expect(parent.textContent).toBe("0");

    count.value = 3;
    expect(parent.textContent).toBe("3");
    expect(parent.childNodes.length).toBe(1);

    for (const cleanup of cleanups) cleanup();
  });
});

describe("attr", () => {
  test("null and false remove the attribute, true sets it empty", () => {
    const value = variable<unknown>("x");
    const el = document.createElement("div");
    const cleanups: Array<() => void> = [];
    attr(el, "data-flag", () => value.value, cleanups);
    expect(el.getAttribute("data-flag")).toBe("x");

    value.value = null;
    expect(el.hasAttribute("data-flag")).toBe(false);

    value.value = true;
    expect(el.getAttribute("data-flag")).toBe("");

    value.value = false;
    expect(el.hasAttribute("data-flag")).toBe(false);

    for (const cleanup of cleanups) cleanup();
  });
});

describe("bindEvent", () => {
  test("handler is removed after cleanups run", () => {
    const button = document.createElement("button");
    const cleanups: Array<() => void> = [];
    let clicks = 0;
    bindEvent(button, "click", () => clicks++, cleanups);

    button.dispatchEvent(new Event("click"));
    expect(clicks).toBe(1);

    for (const cleanup of cleanups) cleanup();
    button.dispatchEvent(new Event("click"));
    expect(clicks).toBe(1);
  });

  test("a handler that writes three variables runs a dependent watcher once", () => {
    const button = document.createElement("button");
    const cleanups: Array<() => void> = [];
    const first = variable(0);
    const second = variable(0);
    const third = variable(0);
    let runs = 0;
    const stop = watch(() => {
      runs++;
      first.value;
      second.value;
      third.value;
    });
    bindEvent(
      button,
      "click",
      () => {
        first.value = 1;
        second.value = 2;
        third.value = 3;
      },
      cleanups,
    );

    button.dispatchEvent(new Event("click"));
    expect(runs).toBe(2);

    stop();
    for (const cleanup of cleanups) cleanup();
  });
});
