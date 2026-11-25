import { describe, expect, test } from "bun:test";
import { ELEMENT_MARKER } from "lusiajs/markers";
import { compileTemplate } from "#compiler/template/scan/scanner.ts";

const FILE = "Post.lusia";

describe("expressions in title and textarea", () => {
  test("a title with an expression binds its whole text", () => {
    const { html, bindings } = compileTemplate("<title>Post {id} - Site</title>", FILE);
    expect(html).toBe(`<title ${ELEMENT_MARKER}></title>`);
    expect(bindings).toEqual([
      {
        kind: "element",
        attrs: [],
        events: [],
        binds: [],
        text: ["Post ", { code: "id", line: 1, column: 14 }, " - Site"],
      },
    ]);
  });

  test("a textarea with only an expression binds its text", () => {
    const { html, bindings } = compileTemplate("<textarea>{note}</textarea>", FILE);
    expect(html).toBe(`<textarea ${ELEMENT_MARKER}></textarea>`);
    expect(bindings).toEqual([
      {
        kind: "element",
        attrs: [],
        events: [],
        binds: [],
        text: [{ code: "note", line: 1, column: 12 }],
      },
    ]);
  });

  test("static title and textarea text is unchanged", () => {
    const { html, bindings } = compileTemplate(
      "<title>Home <b>x</b></title><textarea>a } b</textarea>",
      FILE,
    );
    expect(html).toBe("<title>Home <b>x</b></title><textarea>a } b</textarea>");
    expect(bindings).toEqual([]);
  });

  test("attributes stay on the element next to its text binding", () => {
    const markup = '<textarea rows="3" name={field}>{note}</textarea>';
    const { html, bindings } = compileTemplate(markup, FILE);
    expect(html).toBe(`<textarea rows="3" ${ELEMENT_MARKER}></textarea>`);
    expect(bindings).toEqual([
      {
        kind: "element",
        attrs: [{ name: "name", parts: [{ code: "field", line: 1, column: 26 }] }],
        events: [],
        binds: [],
        text: [{ code: "note", line: 1, column: 34 }],
      },
    ]);
  });

  test("character references next to an expression are decoded", () => {
    const { bindings } = compileTemplate("<title>Tom &amp; Jerry {x} &#39;&#x41;&#66;&lt;</title>", FILE);
    expect(bindings).toEqual([
      {
        kind: "element",
        attrs: [],
        events: [],
        binds: [],
        text: ["Tom & Jerry ", { code: "x", line: 1, column: 25 }, " 'AB<"],
      },
    ]);
  });

  test("an attribute with an expression decodes its character references", () => {
    const { bindings } = compileTemplate('<a title="Tom &amp; {x}"></a>', FILE);
    expect(bindings).toEqual([
      {
        kind: "element",
        attrs: [{ name: "title", parts: ["Tom & ", { code: "x", line: 1, column: 22 }] }],
        events: [],
        binds: [],
      },
    ]);
  });

  test("a title without its close tag is an error", () => {
    expect(() => compileTemplate("<title>{id}", FILE)).toThrow();
  });
});
