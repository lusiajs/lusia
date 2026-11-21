import { describe, expect, test } from "bun:test";
import { createTemplate, instantiate } from "#runtime/dom/template/template.ts";
import { ELEMENT_MARKER, TEXT_MARKER } from "#runtime/markers.ts";

describe("createTemplate and instantiate", () => {
  test("binds in document order and strips markers", () => {
    const html = `<div ${ELEMENT_MARKER}><b><!--${TEXT_MARKER}--></b><!--${TEXT_MARKER}--></div>`;
    const compiled = createTemplate(html);
    expect(compiled.paths).toEqual([[0], [0, 0, 0], [0, 1]]);

    const seen: string[] = [];
    const binders = [0, 1, 2].map((i) => (node: Node) => void seen.push(`${i}:${node.nodeName}`));
    const fragment = instantiate(compiled, "", binders, [], []);
    expect(seen).toEqual(["0:DIV", "1:#comment", "2:#comment"]);

    const div = fragment.firstChild as Element;
    expect(div.hasAttribute(ELEMENT_MARKER)).toBe(false);
  });

  test("adds the inherited classes to every element, and only to the copy", () => {
    const html = `<h1>a</h1><div><p><span>c</span></p></div>`;
    const compiled = createTemplate(html);
    const inherited = instantiate(compiled, "t-a t-b", [], [], []);
    expect(inherited.querySelectorAll(".t-a.t-b").length).toBe(4);
    expect(instantiate(compiled, "", [], [], []).querySelector(".t-a")).toBeNull();
  });

  test("keeps one variant per inherited class list", () => {
    const compiled = createTemplate(`<p>x</p>`);
    instantiate(compiled, "t-a", [], [], []);
    instantiate(compiled, "t-a", [], [], []);
    instantiate(compiled, "t-b", [], [], []);
    expect([...compiled.variants.keys()]).toEqual(["t-a", "t-b"]);
  });
});
