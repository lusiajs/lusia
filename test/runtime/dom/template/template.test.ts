import { describe, expect, test } from "bun:test";
import { createTemplate, instantiate } from "#runtime/dom/template/template.ts";
import { COMPONENT_ATTR, ELEMENT_MARKER, TEXT_MARKER } from "#runtime/markers.ts";

describe("createTemplate and instantiate", () => {
  test("binds in document order and strips markers", () => {
    const html = `<div ${ELEMENT_MARKER}><b><!--${TEXT_MARKER}--></b><!--${TEXT_MARKER}--></div>`;
    const compiled = createTemplate(html, "p");
    expect(compiled.paths).toEqual([[0], [0, 0, 0], [0, 1]]);

    const seen: string[] = [];
    const binders = [0, 1, 2].map((i) => (node: Node) => void seen.push(`${i}:${node.nodeName}`));
    const fragment = instantiate(compiled, binders, [], []);
    expect(seen).toEqual(["0:DIV", "1:#comment", "2:#comment"]);

    const div = fragment.firstChild as Element;
    expect(div.hasAttribute(ELEMENT_MARKER)).toBe(false);
  });

  test("stamps the component id only on top-level elements", () => {
    const html = `<h1>a</h1><div><h1>b</h1><p><span>c</span></p></div>text<!--${TEXT_MARKER}-->`;
    const fragment = instantiate(createTemplate(html, "p"), [() => {}], [], []);
    const topLevel = [...fragment.children];
    expect(topLevel.map((el) => el.getAttribute(COMPONENT_ATTR))).toEqual(["p", "p"]);
    expect(fragment.querySelectorAll(`[${COMPONENT_ATTR}]`).length).toBe(2);
    expect(fragment.querySelector("span")!.hasAttribute(COMPONENT_ATTR)).toBe(false);
  });
});
