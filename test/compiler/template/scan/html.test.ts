import { describe, expect, test } from "bun:test";
import { TEXT_MARKER } from "lusiajs/markers";
import { compile } from "#compiler/index.ts";
import { compileTemplate } from "#compiler/template/scan/scanner.ts";
import { catchError } from "../../catch-error.ts";

const FILE = "Note.lusia";
const TEXT = `<!--${TEXT_MARKER}-->`;

describe("HTML", () => {
  test("<HTML>{expr}</HTML> is a marker bound to the expression", () => {
    const { html, bindings } = compileTemplate("<div><HTML>{note}</HTML></div>", FILE);
    expect(html).toBe(`<div>${TEXT}</div>`);
    expect(bindings).toEqual([{ kind: "html", expr: { code: "note", line: 1, column: 13 } }]);
  });

  test("whitespace around the expression is allowed", () => {
    const { bindings } = compileTemplate("<HTML>\n  {note}\n</HTML>", FILE);
    expect(bindings).toEqual([{ kind: "html", expr: { code: "note", line: 2, column: 4 } }]);
  });

  test("lowercase html is a plain element", () => {
    const { html, bindings } = compileTemplate("<html><b>x</b></html>", FILE);
    expect(html).toBe("<html><b>x</b></html>");
    expect(bindings).toEqual([]);
  });

  test("text inside the tags is an error", () => {
    const error = catchError(() => compileTemplate("<HTML>hi</HTML>", FILE));
    expect(error.code).toBe("L1037");
    expect(error.message).toBe("<HTML> needs one {expression}");
  });

  test("a second expression is an error", () => {
    const error = catchError(() => compileTemplate("<HTML>{a}{b}</HTML>", FILE));
    expect(error.code).toBe("L1037");
    expect(error.column).toBe(1);
  });

  test("text after the expression is an error", () => {
    expect(() => compileTemplate("<HTML>{a} b</HTML>", FILE)).toThrow(
      "<HTML> needs one {expression}",
    );
  });

  test("a self-closing HTML is an error", () => {
    expect(() => compileTemplate("<HTML />", FILE)).toThrow("<HTML> needs one {expression}");
  });

  test("a missing close tag is an error", () => {
    expect(() => compileTemplate("<HTML>{a}", FILE)).toThrow("<HTML> needs one {expression}");
  });

  test("HTML takes no attributes", () => {
    expect(() => compileTemplate('<HTML class="x">{a}</HTML>', FILE)).toThrow(
      "HTML takes no attributes",
    );
  });

  test("HTML cannot be a component name", () => {
    const source = `<script>\nimport HTML from "./html.lusia";\n</script>\n<p>x</p>`;
    const error = catchError(() => compile(source, FILE));
    expect(error.code).toBe("L1004");
    expect(error.message).toBe("HTML is a reserved tag name and cannot be a component");
  });
});
