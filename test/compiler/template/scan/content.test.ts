import { describe, expect, test } from "bun:test";
import { TEXT_MARKER } from "lusiajs/markers";
import { compile } from "#compiler/index.ts";
import { compileTemplate } from "#compiler/template/scan/scanner.ts";
import { catchError } from "../../catch-error.ts";

const FILE = "Card.lusia";
const TEXT = `<!--${TEXT_MARKER}-->`;
const COMPONENTS = new Set(["card"]);

describe("CONTENT", () => {
  test("<CONTENT /> is a marker bound to the component's children", () => {
    const { html, bindings } = compileTemplate("<div><CONTENT /></div>", FILE);
    expect(html).toBe(`<div>${TEXT}</div>`);
    expect(bindings).toEqual([{ kind: "content" }]);
  });

  test("CONTENT takes no attributes", () => {
    const error = catchError(() => compileTemplate('<CONTENT class="x" />', FILE));
    expect(error.message).toBe("CONTENT takes no attributes");
  });

  test("CONTENT must self-close", () => {
    const error = catchError(() => compileTemplate("<CONTENT></CONTENT>", FILE));
    expect(error.code).toBe("L1036");
    expect(error.column).toBe(1);
  });

  test("a second CONTENT is an error", () => {
    const error = catchError(() => compileTemplate("<CONTENT /><p><CONTENT /></p>", FILE));
    expect(error.code).toBe("L1035");
    expect(error.column).toBe(15);
  });

  test("a CONTENT inside a block counts as the one", () => {
    const { bindings } = compileTemplate("<IF {on}><CONTENT /></IF>", FILE);
    expect(bindings[0]).toMatchObject({ kind: "if" });
  });

  test("lowercase content is a plain element", () => {
    const { html, bindings } = compileTemplate("<content></content>", FILE);
    expect(html).toBe("<content></content>");
    expect(bindings).toEqual([]);
  });

  test("CONTENT cannot be a component name", () => {
    const source = `<script>\nimport CONTENT from "./content.lusia";\n</script>\n<p>x</p>`;
    const error = catchError(() => compile(source, FILE));
    expect(error.code).toBe("L1004");
    expect(error.message).toBe("CONTENT is a reserved tag name and cannot be a component");
  });
});

describe("component children", () => {
  test("markup between the tags becomes the component's children", () => {
    const { html, bindings } = compileTemplate("<card><p>hi</p></card>", FILE, 1, COMPONENTS);
    expect(html).toBe(TEXT);
    expect(bindings).toEqual([
      {
        kind: "component",
        name: "card",
        props: [],
        binds: [],
        children: { html: "<p>hi</p>", bindings: [] },
      },
    ]);
  });

  test("children keep their own bindings, apart from the parent's", () => {
    const { html, bindings } = compileTemplate("<p>{a}</p><card>{b}</card>", FILE, 1, COMPONENTS);
    expect(html).toBe(`<p>${TEXT}</p>${TEXT}`);
    expect(bindings[1]).toMatchObject({
      kind: "component",
      children: { html: TEXT, bindings: [{ kind: "text", expr: { code: "b" } }] },
    });
  });

  test("blank children are no children", () => {
    const { bindings } = compileTemplate("<card>\n  </card>", FILE, 1, COMPONENTS);
    expect(bindings).toEqual([{ kind: "component", name: "card", props: [], binds: [] }]);
  });

  test("a nested component keeps its own children", () => {
    const { bindings } = compileTemplate("<card><card><b>x</b></card></card>", FILE, 1, COMPONENTS);
    expect(bindings[0]).toMatchObject({
      children: { bindings: [{ kind: "component", name: "card", children: { html: "<b>x</b>" } }] },
    });
  });

  test("CONTENT inside children belongs to the enclosing file", () => {
    const { bindings } = compileTemplate("<card><CONTENT /></card>", FILE, 1, COMPONENTS);
    expect(bindings[0]).toMatchObject({
      children: { bindings: [{ kind: "content" }] },
    });
  });

  test("a block inside children stops at the component's close tag", () => {
    const error = catchError(() =>
      compileTemplate("<card><IF {on}><p>x</card>", FILE, 1, COMPONENTS),
    );
    expect(error.code).toBe("L1027");
    expect(error.message).toBe("expected </IF>");
  });

  test("a stray block close inside children is an error", () => {
    const error = catchError(() => compileTemplate("<card></IF></card>", FILE, 1, COMPONENTS));
    expect(error.code).toBe("L1033");
  });
});
