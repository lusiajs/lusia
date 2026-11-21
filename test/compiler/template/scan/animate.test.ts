import { describe, expect, test } from "bun:test";
import { ELEMENT_MARKER } from "lusia/markers";
import { compileTemplate } from "#compiler/template/scan/scanner.ts";

const FILE = "Card.lusia";

describe("animate attribute", () => {
  test("animate becomes the element's animate expression and its marker", () => {
    const { html, bindings } = compileTemplate("<div animate={frames}>Hi</div>", FILE);
    expect(html).toBe(`<div ${ELEMENT_MARKER}>Hi</div>`);
    expect(bindings).toEqual([
      {
        kind: "element",
        attrs: [],
        events: [],
        binds: [],
        animate: { code: "frames", line: 1, column: 15 },
      },
    ]);
  });

  test("other attributes next to animate are plain bindings on the same element", () => {
    const { html, bindings } = compileTemplate(
      "<div animate={frames} duration={400}>Hi</div>",
      FILE,
    );
    expect(html).toBe(`<div ${ELEMENT_MARKER}>Hi</div>`);
    expect(bindings).toEqual([
      {
        kind: "element",
        attrs: [{ name: "duration", parts: [{ code: "400", line: 1, column: 33 }] }],
        events: [],
        binds: [],
        animate: { code: "frames", line: 1, column: 15 },
      },
    ]);
  });

  test("option-like names are ordinary attributes, with or without animate", () => {
    const plain = compileTemplate("<div duration={400} once onview>Hi</div>", FILE);
    expect(plain.html).toBe(`<div once onview ${ELEMENT_MARKER}>Hi</div>`);
    expect(plain.bindings).toEqual([
      {
        kind: "element",
        attrs: [{ name: "duration", parts: [{ code: "400", line: 1, column: 16 }] }],
        events: [],
        binds: [],
      },
    ]);

    const animated = compileTemplate("<p animate={a} once onview loop={3}>x</p>", FILE);
    expect(animated.html).toBe(`<p once onview ${ELEMENT_MARKER}>x</p>`);
    expect(animated.bindings).toEqual([
      {
        kind: "element",
        attrs: [{ name: "loop", parts: [{ code: "3", line: 1, column: 34 }] }],
        events: [],
        binds: [],
        animate: { code: "a", line: 1, column: 13 },
      },
    ]);
  });

  test("dynamic attributes on the same element share one binding", () => {
    const { html, bindings } = compileTemplate('<a href="/x" title={t} animate={a}>x</a>', FILE);
    expect(html).toBe(`<a href="/x" ${ELEMENT_MARKER}>x</a>`);
    expect(bindings).toEqual([
      {
        kind: "element",
        attrs: [{ name: "title", parts: [{ code: "t", line: 1, column: 21 }] }],
        events: [],
        binds: [],
        animate: { code: "a", line: 1, column: 33 },
      },
    ]);
  });

  test("a static animate value is an error", () => {
    expect(() => compileTemplate('<div animate="fade">x</div>', FILE)).toThrow(
      "animate needs {keyframes}",
    );
  });

  test("two animate attributes on one element are an error", () => {
    expect(() => compileTemplate("<div animate={a} animate={b}>x</div>", FILE)).toThrow(
      "an element can have only one animate",
    );
  });

  test("an animate on a component tag stays a prop", () => {
    const { bindings } = compileTemplate("<badge animate={a} />", FILE, 1, new Set(["badge"]));
    expect(bindings).toEqual([
      {
        kind: "component",
        name: "badge",
        props: [{ name: "animate", parts: [{ code: "a", line: 1, column: 17 }] }],
        binds: [],
      },
    ]);
  });
});
