import { afterEach, describe, expect, test } from "bun:test";
import BoundField from "../fixtures/BoundField.lusia";
import FixedBind from "../fixtures/FixedBind.lusia";
import { click, host, mount, resetMounts, text } from "../fixtures/mount.ts";

afterEach(resetMounts);

function type(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event("input"));
}

describe("bind-value on a component", () => {
  test("the child's input writes back to the parent's variable", () => {
    const el = host();
    mount(BoundField, el);
    const [first] = el.querySelectorAll("input") as NodeListOf<HTMLInputElement>;

    type(first!, "Grace");

    expect(text(el, ".name")).toBe("Grace");
  });

  test("a parent update reaches the child's input", () => {
    const el = host();
    mount(BoundField, el);
    const [first] = el.querySelectorAll("input") as NodeListOf<HTMLInputElement>;

    click(el, ".rename");

    expect(first!.value).toBe("Grace");
  });

  test("bind-value on its own binds the value prop", () => {
    const el = host();
    mount(BoundField, el);
    const [, second] = el.querySelectorAll("input") as NodeListOf<HTMLInputElement>;

    type(second!, "Hopper");

    expect(text(el, ".other")).toBe("Hopper");
  });

  test("a prop the parent did not bind is read-only and refuses writes", () => {
    const el = host();
    mount(BoundField, el);

    expect(text(el, ".label")).toBe("Ada");
    click(el, ".write");

    expect(text(el, ".failure")).toBe("label is read-only in this component");
    expect(text(el, ".label")).toBe("Ada");
  });

  test("binding a value that is not a variable is an error", () => {
    expect(() => mount(FixedBind, host())).toThrow("bind-value needs a writable variable");
  });
});
