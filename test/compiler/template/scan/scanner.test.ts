import { describe, expect, test } from "bun:test";
import { ELEMENT_MARKER, TEXT_MARKER } from "lusia/markers";
import { compileTemplate } from "#compiler/template/scan/scanner.ts";
import type { Binding } from "#compiler/template/types/template.ts";
import { catchError } from "../../catch-error.ts";

const FILE = "Card.lusia";
const TEXT = `<!--${TEXT_MARKER}-->`;
const COMPONENTS = new Set(["badge"]);

function firstPart(binding: Binding): unknown {
  if (binding.kind === "text") return binding.expr;
  if (binding.kind === "element") return binding.attrs[0]!.parts[0];
  if (binding.kind === "component") return binding.props[0]!.parts[0];
  return undefined;
}

describe("compileTemplate", () => {
  test("static markup is unchanged", () => {
    const { html, bindings } = compileTemplate('<p class="a">Hi <!-- note --></p>', FILE);
    expect(html).toBe('<p class="a">Hi <!-- note --></p>');
    expect(bindings).toEqual([]);
  });

  test("text expressions become markers", () => {
    const { html, bindings } = compileTemplate("<p>Hi {name}, {a + b}</p>", FILE);
    expect(html).toBe(`<p>Hi ${TEXT}, ${TEXT}</p>`);
    expect(bindings).toEqual([
      { kind: "text", expr: { code: "name", line: 1, column: 8 } },
      { kind: "text", expr: { code: "a + b", line: 1, column: 16 } },
    ]);
  });

  test("braces and quotes inside expressions are skipped", () => {
    const { bindings } = compileTemplate("<p>{ { a: '}' }.a + `}` }</p>", FILE);
    expect(bindings).toEqual([
      { kind: "text", expr: { code: "{ a: '}' }.a + `}`", line: 1, column: 6 } },
    ]);
  });

  test("attribute expressions mark the element and keep static attributes", () => {
    const { html, bindings } = compileTemplate(
      '<a href="/x" class="btn {kind}" title={label} hidden>go</a>',
      FILE,
    );
    expect(html).toBe(`<a href="/x" hidden ${ELEMENT_MARKER}>go</a>`);
    expect(bindings).toEqual([
      {
        kind: "element",
        attrs: [
          { name: "class", parts: ["btn ", { code: "kind", line: 1, column: 26 }] },
          { name: "title", parts: [{ code: "label", line: 1, column: 40 }] },
        ],
        events: [],
        binds: [],
      },
    ]);
  });

  test("bindings follow document order", () => {
    const { bindings } = compileTemplate("<div id={a}>{b}<span id={c} /></div>", FILE);
    expect(bindings.map(firstPart)).toEqual([
      { code: "a", line: 1, column: 10 },
      { code: "b", line: 1, column: 14 },
      { code: "c", line: 1, column: 26 },
    ]);
  });

  test("unclosed expression reports its line and column", () => {
    const error = catchError(() => compileTemplate("<p>\n  {oops</p>", FILE, 10));
    expect(error.code).toBe("L1010");
    expect(error.message).toBe("unclosed {");
    expect(error.file).toBe(FILE);
    expect(error.line).toBe(11);
    expect(error.column).toBe(3);
  });

  test("empty expression is an error", () => {
    expect(() => compileTemplate("<p>{ }</p>", FILE)).toThrow("empty {}");
  });
});

describe("compileTemplate component tags", () => {
  test("self-closing tag becomes a component marker with props", () => {
    const { html, bindings } = compileTemplate(
      '<badge title={name} label="New" flag />',
      FILE,
      1,
      COMPONENTS,
    );
    expect(html).toBe(TEXT);
    expect(bindings).toEqual([
      {
        kind: "component",
        name: "badge",
        props: [
          { name: "title", parts: [{ code: "name", line: 1, column: 15 }] },
          { name: "label", parts: ["New"] },
          { name: "flag", parts: [] },
        ],
        binds: [],
      },
    ]);
  });

  test("tag with an empty close pair is a component", () => {
    const { html, bindings } = compileTemplate(
      '<p><badge label="x"></badge></p>',
      FILE,
      1,
      COMPONENTS,
    );
    expect(html).toBe(`<p>${TEXT}</p>`);
    expect(bindings).toEqual([
      {
        kind: "component",
        name: "badge",
        props: [{ name: "label", parts: ["x"] }],
        binds: [],
      },
    ]);
  });

  test("a component without its close tag is an error at the open tag", () => {
    const error = catchError(() =>
      compileTemplate("<p>\n  <badge>hi</badge></p>\n<badge>", FILE, 1, COMPONENTS),
    );
    expect(error.code).toBe("L1009");
    expect(error.message).toBe("<badge> needs a closing </badge>");
    expect(error.line).toBe(3);
    expect(error.column).toBe(1);
  });

  test("lowercase component name matches the import name", () => {
    const { bindings } = compileTemplate("<badge />", FILE, 1, new Set(["badge"]));
    expect(bindings).toEqual([{ kind: "component", name: "badge", props: [], binds: [] }]);
  });

  test("unknown tags stay plain HTML", () => {
    const { html, bindings } = compileTemplate('<card title="x" />', FILE, 1, COMPONENTS);
    expect(html).toBe('<card title="x" />');
    expect(bindings).toEqual([]);
  });

  test("a prop with text and an expression keeps both parts", () => {
    const { bindings } = compileTemplate('<badge label="{count} new" />', FILE, 1, COMPONENTS);
    expect(bindings).toEqual([
      {
        kind: "component",
        name: "badge",
        props: [{ name: "label", parts: [{ code: "count", line: 1, column: 16 }, " new"] }],
        binds: [],
      },
    ]);
  });
});
