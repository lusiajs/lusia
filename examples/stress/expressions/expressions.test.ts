import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { attach, type Instance } from "lusiajs";
import { resetVariable } from "../variable.ts";
import Edge from "./Edge.lusia";

let target: HTMLElement;
let instance: Instance;

beforeEach(() => {
  target = document.createElement("div");
  document.body.append(target);
  instance = attach(Edge, target);
});

afterEach(() => {
  instance.detach();
  target.remove();
  resetVariable();
});

function textOf(id: string): string {
  return target.querySelector(`#${id}`)!.textContent!;
}

describe("tricky expressions", () => {
  test("text expressions render their exact values", () => {
    expect(textOf("nested")).toBe("1");
    expect(textOf("braces")).toBe("}{");
    expect(textOf("template")).toBe("1 + 2 = 3");
    expect(textOf("ternary")).toBe("small");
    expect(textOf("optional")).toBe("none");
    expect(textOf("optional-set")).toBe("Ada");
    expect(textOf("numbers")).toBe("0 NaN");
    expect(textOf("empty")).toBe("[][][][true]");
    expect(textOf("unicode")).toBe("héllo 👋 日本語");
    expect(textOf("diamond")).toBe("4");
  });

  test("a string with markup renders as text, not as an element", () => {
    const unsafe = target.querySelector("#unsafe")!;
    expect(unsafe.textContent).toBe("<script>alert(1)</script>");
    expect(unsafe.querySelector("script")).toBeNull();
  });

  test("null, undefined and false remove whole attributes; true sets it empty", () => {
    const attrs = target.querySelector("#attrs")!;
    expect(attrs.hasAttribute("data-null")).toBe(false);
    expect(attrs.hasAttribute("data-undef")).toBe(false);
    expect(attrs.hasAttribute("data-false")).toBe(false);
    expect(attrs.getAttribute("data-true")).toBe("");
    expect(attrs.getAttribute("data-zero")).toBe("0");
    expect(attrs.getAttribute("data-nan")).toBe("NaN");
  });

  test("partial attributes turn null, undefined and false into empty strings", () => {
    const attrs = target.querySelector("#attrs")!;
    expect(attrs.getAttribute("data-partial")).toBe("[|||true|0|NaN]");
  });

  test("an HTML comment in the markup is not rendered", () => {
    expect(target.textContent).not.toContain("not an expression");
  });

  test(":global styles are not scoped", () => {
    const styles = [...document.querySelectorAll("style[data-lusia]")].map(
      (style) => style.textContent,
    );
    expect(styles.some((css) => css!.includes(".edge-global {"))).toBe(true);
  });
});
