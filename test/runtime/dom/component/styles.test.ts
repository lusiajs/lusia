import { describe, expect, test } from "bun:test";
import { injectStyle } from "#runtime/dom/component/styles.ts";

describe("injectStyle", () => {
  test("adds one <style> per id", () => {
    injectStyle("dom-test-once", "p { color: red; }");
    injectStyle("dom-test-once", "p { color: blue; }");
    const styles = document.querySelectorAll('style[data-lusia="dom-test-once"]');
    expect(styles.length).toBe(1);
    expect(styles[0]!.textContent).toBe("p { color: red; }");
  });
});
