import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { bindElement } from "#runtime/dom/bind/element.ts";
import { bindInput } from "#runtime/dom/bind/input.ts";
import { bindProp } from "#runtime/dom/bind/property.ts";
import { watch } from "#runtime/variable/graph.ts";
import { variable } from "#runtime/variable/variable.ts";
import Clicks from "./fixtures/Clicks.lusia";
import Fields from "./fixtures/Fields.lusia";
import Writes from "./fixtures/Writes.lusia";
import { resetVariable, state } from "./fixtures/state.ts";
import { click, host, mount, resetMounts, text, unmount } from "./fixtures/mount.ts";

beforeEach(resetVariable);
afterEach(resetMounts);

function field(root: ParentNode, selector: string): HTMLInputElement {
  return root.querySelector(selector) as HTMLInputElement;
}

describe("onclick", () => {
  test("calls the handler on each click", () => {
    const el = host();
    mount(Clicks, el);
    click(el, ".bump");
    click(el, ".bump");
    expect(text(el, ".bump")).toBe("2");
  });

  test("a handler that writes three variables runs a dependent watcher once", () => {
    const el = host();
    mount(Writes, el);
    let runs = 0;
    const stop = variable.autoRun(function countRuns() {
      runs++;
      state.from.value;
      state.to.value;
      state.step.value;
    });
    click(el, ".write");
    expect(runs).toBe(2);
    stop();
  });

  test("the listener is removed when the component is detached", () => {
    const el = host();
    const instance = mount(Clicks, el);
    const button = el.querySelector(".bump")!;
    unmount(instance);
    button.dispatchEvent(new Event("click"));
    expect(state.count.value).toBe(0);
  });
});

describe("bind-value on form controls", () => {
  test("a text input reads the variable and writes it back on input", () => {
    const el = host();
    mount(Fields, el);
    const input = field(el, ".text");
    expect(input.value).toBe("hi");

    input.value = "there";
    input.dispatchEvent(new Event("input"));
    expect(state.text.value).toBe("there");
    expect(text(el, ".out")).toBe("there");

    state.text.value = "from code";
    expect(input.value).toBe("from code");
  });

  test("a write from a bound input runs each dependent watcher once", () => {
    const text = variable("a");
    const upper = variable.compute(() => text.value.toUpperCase());
    const input = document.createElement("input");
    const cleanups: Array<() => void> = [];
    bindInput(input, text, cleanups);
    const seen: string[] = [];
    const stop = watch(() => {
      seen.push(`${text.value}/${upper.value}`);
    });

    input.value = "b";
    input.dispatchEvent(new Event("input"));
    expect(seen).toEqual(["a/A", "b/B"]);

    stop();
    for (const cleanup of cleanups) cleanup();
  });

  test("a checkbox uses checked and the change event", () => {
    const el = host();
    mount(Fields, el);
    const box = field(el, ".check");
    box.checked = true;
    box.dispatchEvent(new Event("change"));
    expect(state.checked.value).toBe(true);

    state.checked.value = false;
    expect(box.checked).toBe(false);
  });

  test("a number input writes numbers, and an empty field writes null", () => {
    const el = host();
    mount(Fields, el);
    const number = field(el, ".number");
    expect(number.value).toBe("3");

    number.value = "7";
    number.dispatchEvent(new Event("input"));
    expect(state.number.value).toBe(7);

    number.value = "";
    number.dispatchEvent(new Event("input"));
    expect(state.number.value).toBe(null);
    expect(number.value).toBe("");
  });

  test("a select uses the change event", () => {
    // happy-dom cannot remove a select, so this element is never attached or removed.
    const select = document.createElement("select");
    select.innerHTML = '<option value="a">A</option><option value="b">B</option>';
    const choice = variable("a");
    const cleanups: Array<() => void> = [];
    bindInput(select, choice, cleanups);
    expect(select.value).toBe("a");

    select.value = "b";
    select.dispatchEvent(new Event("change"));
    expect(choice.value).toBe("b");
    for (const cleanup of cleanups) cleanup();
  });

  test("bind-<prop> maps a kebab-case name to a DOM property", () => {
    const el = host();
    mount(Fields, el);
    const off = field(el, ".off");
    state.disabled.value = true;
    expect(off.disabled).toBe(true);

    off.disabled = false;
    off.dispatchEvent(new Event("change"));
    expect(state.disabled.value).toBe(false);
  });

  test("bind-element sets the element while attached and null after", () => {
    const el = host();
    const instance = mount(Fields, el);
    const ref = el.querySelector(".ref");
    expect(state.ref.value).toBe(ref);

    unmount(instance);
    expect(state.ref.value).toBe(null);
  });
});

describe("bind runtime rules", () => {
  test("a computed variables is not writable", () => {
    const cleanups: Array<() => void> = [];
    const input = document.createElement("input");
    expect(() =>
      bindInput(
        input,
        variable.compute(() => "x"),
        cleanups,
      ),
    ).toThrow("bind-value needs a writable variable");
    expect(() => bindProp(input, "value", 5, cleanups)).toThrow(
      "bind-value needs a writable variable",
    );
    expect(() =>
      bindElement(
        input,
        variable.compute(() => null),
        cleanups,
      ),
    ).toThrow("bind-element needs a writable variable");
  });

  test("an equal value is not written back to the DOM", () => {
    const value = variable("a");
    const input = document.createElement("input");
    const cleanups: Array<() => void> = [];
    bindInput(input, value, cleanups);
    let writes = 0;
    const descriptor = Object.getOwnPropertyDescriptor(input, "value");
    Object.defineProperty(input, "value", {
      get: () => descriptor?.get?.call(input) ?? input.getAttribute("value") ?? "",
      set(next: string) {
        writes++;
        descriptor?.set?.call(input, next);
      },
    });
    value.value = "a";
    expect(writes).toBe(0);
    for (const cleanup of cleanups) cleanup();
  });
});
