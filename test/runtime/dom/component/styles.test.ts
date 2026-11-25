import { describe, expect, test } from "bun:test";
import { injectStyle } from "#runtime/dom/component/styles.ts";

describe("injectStyle with a page built on the server", () => {
  test("skips a style id that the shared CSS file already has", () => {
    document.documentElement.dataset.lusiaStyles = "dom-test-built";
    const link = document.createElement("link");
    link.dataset.lusiaSsr = "";
    document.head.append(link);
    injectStyle("dom-test-built", "p { color: red; }");
    injectStyle("dom-test-other", "p { color: blue; }");
    expect(document.querySelectorAll('style[data-lusia="dom-test-built"]').length).toBe(0);
    expect(document.querySelectorAll('style[data-lusia="dom-test-other"]').length).toBe(1);
    link.remove();
    delete document.documentElement.dataset.lusiaStyles;
  });
});

describe("injectStyle", () => {
  test("adds one <style> per id", () => {
    injectStyle("dom-test-once", "p { color: red; }");
    injectStyle("dom-test-once", "p { color: blue; }");
    const styles = document.querySelectorAll('style[data-lusia="dom-test-once"]');
    expect(styles.length).toBe(1);
    expect(styles[0]!.textContent).toBe("p { color: red; }");
  });
});
