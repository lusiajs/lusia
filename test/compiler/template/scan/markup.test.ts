import { describe, expect, test } from "bun:test";
import { ELEMENT_MARKER, TEXT_MARKER } from "lusiajs/markers";
import { compile } from "#compiler/index.ts";
import { compileTemplate } from "#compiler/template/scan/scanner.ts";
import { catchError } from "../../catch-error.ts";

const FILE = "Card.lusia";
const TEXT = `<!--${TEXT_MARKER}-->`;

describe("events", () => {
  test("onX={expr} becomes a listener on the element", () => {
    const { html, bindings } = compileTemplate("<button onclick={go}>x</button>", FILE);
    expect(html).toBe(`<button ${ELEMENT_MARKER}>x</button>`);
    expect(bindings).toEqual([
      {
        kind: "element",
        attrs: [],
        events: [{ type: "click", listen: false, expr: { code: "go", line: 1, column: 18 } }],
        binds: [],
      },
    ]);
  });

  test("a static onclick string stays plain HTML", () => {
    const { html, bindings } = compileTemplate('<button onclick="go()">x</button>', FILE);
    expect(html).toBe('<button onclick="go()">x</button>');
    expect(bindings).toEqual([]);
  });

  test("a dashed event name keeps its dashes", () => {
    const named = compileTemplate("<div oncustom-thing={f}></div>", FILE);
    expect(named.bindings).toEqual([
      {
        kind: "element",
        attrs: [],
        events: [{ type: "custom-thing", listen: false, expr: { code: "f", line: 1, column: 22 } }],
        binds: [],
      },
    ]);
  });

  test("an arrow function with braces is one handler", () => {
    const { bindings } = compileTemplate(
      "<input oninput={(e) => { set(e.target.value) }} />",
      FILE,
    );
    expect(bindings).toEqual([
      {
        kind: "element",
        attrs: [],
        events: [
          {
            type: "input",
            listen: false,
            expr: { code: "(e) => { set(e.target.value) }", line: 1, column: 17 },
          },
        ],
        binds: [],
      },
    ]);
  });

  test("an event with text around the expression is an error", () => {
    expect(() => compileTemplate('<b onclick="go({x})"></b>', FILE)).toThrow(
      "onclick needs one {handler}",
    );
  });

  test("an event on a component tag is a prop", () => {
    const { bindings } = compileTemplate("<badge onclick={f} />", FILE, 1, new Set(["badge"]));
    expect(bindings).toEqual([
      {
        kind: "component",
        name: "badge",
        props: [{ name: "onclick", parts: [{ code: "f", line: 1, column: 17 }] }],
        binds: [],
      },
    ]);
  });
});

describe("bind-value", () => {
  test("bind-value on an input picks its property later, at attach", () => {
    const { bindings } = compileTemplate("<input bind-value={name} />", FILE);
    expect(bindings).toEqual([
      {
        kind: "element",
        attrs: [],
        events: [],
        binds: [{ kind: "input", expr: { code: "name", line: 1, column: 20 } }],
      },
    ]);
  });

  test("bind-<prop> maps kebab-case to camelCase", () => {
    const { bindings } = compileTemplate("<p bind-text-content={t}>x</p>", FILE);
    expect(bindings).toEqual([
      {
        kind: "element",
        attrs: [],
        events: [],
        binds: [{ kind: "prop", prop: "textContent", expr: { code: "t", line: 1, column: 23 } }],
      },
    ]);
  });

  test("bind-element takes an element reference", () => {
    const { bindings } = compileTemplate("<div bind-element={ref}></div>", FILE);
    expect(bindings).toEqual([
      {
        kind: "element",
        attrs: [],
        events: [],
        binds: [{ kind: "element", expr: { code: "ref", line: 1, column: 20 } }],
      },
    ]);
  });

  test("bind-value works only on input, textarea and select", () => {
    const error = catchError(() => compileTemplate("<div bind-value={x}></div>", FILE));
    expect(error.code).toBe("L1024");
    expect(error.message).toBe("bind-value works on input, textarea and select");
    expect(error.line).toBe(1);
    expect(error.column).toBe(6);
  });

  test("bind-value needs one {variable}", () => {
    expect(() => compileTemplate("<input bind-value />", FILE)).toThrow(
      "bind-value needs {variable}",
    );
  });

  test("bind-value on a component tag is the value prop, written back to the variable", () => {
    const { bindings } = compileTemplate("<badge bind-value={x} />", FILE, 1, new Set(["badge"]));
    expect(bindings).toEqual([
      {
        kind: "component",
        name: "badge",
        props: [],
        binds: [{ prop: "value", attr: "bind-value", expr: { code: "x", line: 1, column: 20 } }],
      },
    ]);
  });

  test("bind-<prop> on a component tag names the prop in camelCase", () => {
    const { bindings } = compileTemplate(
      "<badge bind-tone-name={x} />",
      FILE,
      1,
      new Set(["badge"]),
    );
    expect(bindings).toEqual([
      {
        kind: "component",
        name: "badge",
        props: [],
        binds: [
          {
            prop: "toneName",
            attr: "bind-tone-name",
            expr: { code: "x", line: 1, column: 24 },
          },
        ],
      },
    ]);
  });

  test("bind-element on a component tag is an error", () => {
    expect(() =>
      compileTemplate("<badge bind-element={x} />", FILE, 1, new Set(["badge"])),
    ).toThrow("bind-element works on elements only");
  });

  test("bind-value on a component tag needs one {variable}", () => {
    expect(() => compileTemplate("<badge bind-value />", FILE, 1, new Set(["badge"]))).toThrow(
      "bind-value needs {variable}",
    );
  });
});

describe("IF, ELSEIF and ELSE", () => {
  test("one marker for the whole chain, with a branch per tag", () => {
    const { html, bindings } = compileTemplate(
      "<IF {a}><p>1</p></IF>\n<ELSEIF {b}>2</ELSEIF>\n<ELSE>3</ELSE>",
      FILE,
    );
    expect(html).toBe(TEXT);
    expect(bindings).toEqual([
      {
        kind: "if",
        branches: [
          { test: { code: "a", line: 1, column: 6 }, body: { html: "<p>1</p>", bindings: [] } },
          { test: { code: "b", line: 2, column: 10 }, body: { html: "2", bindings: [] } },
          { body: { html: "3", bindings: [] } },
        ],
      },
    ]);
  });

  test("ELSE without a preceding IF is an error", () => {
    expect(() => compileTemplate("<ELSE>x</ELSE>", FILE)).toThrow(
      "<ELSE> must directly follow </IF> or </ELSEIF>",
    );
  });

  test("text between </IF> and ELSE breaks the chain", () => {
    expect(() => compileTemplate("<IF {a}>x</IF> hi <ELSE>y</ELSE>", FILE)).toThrow(
      "<ELSE> must directly follow",
    );
  });

  test("ELSE after ELSE is an error", () => {
    expect(() => compileTemplate("<IF {a}>x</IF><ELSE>y</ELSE><ELSE>z</ELSE>", FILE)).toThrow(
      "<ELSE> must directly follow",
    );
  });

  test("IF needs a condition", () => {
    expect(() => compileTemplate("<IF>x</IF>", FILE)).toThrow("IF needs {condition}");
  });

  test("ELSE takes no attributes", () => {
    expect(() => compileTemplate('<IF {a}>x</IF><ELSE class="y">z</ELSE>', FILE)).toThrow(
      "ELSE takes no attributes",
    );
  });

  test("a missing close tag is reported at the opening tag", () => {
    const error = catchError(() => compileTemplate("<p>\n<IF {a}>x", FILE));
    expect(error.code).toBe("L1001");
    expect(error.message).toBe("unclosed <IF>");
    expect(error.line).toBe(2);
    expect(error.column).toBe(1);
  });

  test("a mismatched close tag is an error", () => {
    expect(() => compileTemplate("<IF {a}>x</EACH>", FILE)).toThrow(
      "expected </IF>, found </EACH>",
    );
  });

  test("a stray close tag is an error", () => {
    expect(() => compileTemplate("x</IF>", FILE)).toThrow("unexpected </IF>");
  });

  test("a self-closing block is an error", () => {
    expect(() => compileTemplate("<IF {a} />", FILE)).toThrow("<IF> needs a closing </IF>");
  });
});

describe("EACH", () => {
  test("list, as, index and key", () => {
    const { bindings } = compileTemplate(
      "<EACH {todos} as={todo} index={i} key={todo.id}><li>{i}</li></EACH>",
      FILE,
    );
    expect(bindings).toEqual([
      {
        kind: "each",
        list: { code: "todos", line: 1, column: 8 },
        item: "todo",
        index: "i",
        key: { code: "todo.id", line: 1, column: 40 },
        body: {
          html: "<li><!--l--></li>",
          bindings: [{ kind: "text", expr: { code: "i", line: 1, column: 54 } }],
        },
      },
    ]);
  });

  test("everything but the list is optional", () => {
    const { bindings } = compileTemplate("<EACH {rows}>x</EACH>", FILE);
    expect(bindings).toEqual([
      {
        kind: "each",
        list: { code: "rows", line: 1, column: 8 },
        body: { html: "x", bindings: [] },
      },
    ]);
  });

  test("as must be a name", () => {
    expect(() => compileTemplate("<EACH {rows} as={a.b}>x</EACH>", FILE)).toThrow(
      "as needs a name in {}",
    );
  });

  test("EACH needs a list", () => {
    expect(() => compileTemplate("<EACH>x</EACH>", FILE)).toThrow("EACH needs {list}");
  });

  test("unknown attributes are an error", () => {
    expect(() => compileTemplate("<EACH {rows} sort={x}>x</EACH>", FILE)).toThrow(
      "EACH has no sort attribute",
    );
  });

  test("nested blocks keep their own bindings", () => {
    const { bindings } = compileTemplate(
      "<EACH {rows} as={r}><IF {r.open}><b>{r.name}</b></IF></EACH>",
      FILE,
    );
    const each = bindings[0] as unknown as { body: { html: string; bindings: unknown[] } };
    expect(each.body.html).toBe(TEXT);
    expect(each.body.bindings).toEqual([
      {
        kind: "if",
        branches: [
          {
            test: { code: "r.open", line: 1, column: 26 },
            body: {
              html: "<b><!--l--></b>",
              bindings: [{ kind: "text", expr: { code: "r.name", line: 1, column: 38 } }],
            },
          },
        ],
      },
    ]);
  });
});

describe("FOR", () => {
  test("loop name, bounds and defaults", () => {
    const { bindings } = compileTemplate("<FOR {n} to={5}><i>{n}</i></FOR>", FILE);
    expect(bindings).toEqual([
      {
        kind: "for",
        name: "n",
        to: { code: "5", line: 1, column: 14 },
        body: {
          html: "<i><!--l--></i>",
          bindings: [{ kind: "text", expr: { code: "n", line: 1, column: 21 } }],
        },
      },
    ]);
  });

  test("FOR needs a loop name in braces and a to", () => {
    expect(() => compileTemplate("<FOR to={3}>x</FOR>", FILE)).toThrow(
      "FOR needs a name in {}, like {i}",
    );
    expect(() => compileTemplate("<FOR {i}>x</FOR>", FILE)).toThrow("FOR needs to={end}");
  });
});

describe("reserved tags", () => {
  test("an import named like a control tag is an error", () => {
    const source = `<script>\nimport IF from "./if.lusia";\n</script>\n<p>x</p>`;
    const error = catchError(() => compile(source, FILE));
    expect(error.code).toBe("L1004");
    expect(error.message).toBe("IF is a reserved tag name and cannot be a component");
    expect(error.line).toBe(2);
    expect(error.column).toBe(1);
  });
});

describe("on:name", () => {
  test("on:view on an element goes through listen", () => {
    const { bindings } = compileTemplate("<p on:view={show}>x</p>", FILE);
    const element = bindings[0] as { events: unknown[] };
    expect(element.events).toEqual([
      { type: "view", listen: true, expr: { code: "show", line: 1, column: 13 } },
    ]);
  });

  test("on:click and onclick can sit side by side", () => {
    const { bindings } = compileTemplate("<p onclick={a} on:click={b}>x</p>", FILE);
    const element = bindings[0] as { events: Array<{ listen: boolean }> };
    expect(element.events.map((event) => event.listen)).toEqual([false, true]);
  });

  test("on: on a component is an error", () => {
    expect(() => compileTemplate("<card on:view={show} />", FILE, 1, new Set(["card"]))).toThrow(
      "on:view works on elements only, not on components",
    );
  });
});
