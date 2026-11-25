import { describe, expect, test } from "bun:test";
import { markupClasses, styleClasses } from "#compiler/style/classes.ts";

describe("styleClasses", () => {
  test("collects class names in tree mode", () => {
    expect(styleClasses(".card .title { color: red; }", "tree")).toEqual([
      { name: "card", mode: "tree" },
      { name: "title", mode: "tree" },
    ]);
  });

  test("uses the given mode for every class", () => {
    expect(styleClasses(".a { color: red; }", "scoped")).toEqual([{ name: "a", mode: "scoped" }]);
  });

  test("skips every class in global mode", () => {
    expect(styleClasses(".a { color: red; }", "global")).toEqual([]);
  });

  test("switches mode inside @scoped and @global blocks", () => {
    const css = ".a { } @scoped { .b { } } @global { .c { } }";
    expect(styleClasses(css, "tree")).toEqual([
      { name: "a", mode: "tree" },
      { name: "b", mode: "scoped" },
    ]);
  });

  test("skips a :global() selector", () => {
    expect(styleClasses(":global(.x) { color: red; }", "tree")).toEqual([]);
  });

  test("keeps the scoped class next to a :global() class", () => {
    expect(styleClasses(".y :global(.x) { color: red; }", "tree")).toEqual([
      { name: "y", mode: "tree" },
    ]);
  });

  test("reads classes inside @media and @supports", () => {
    const css = "@media (max-width: 600px) { .m { } } @supports (display: grid) { .g { } }";
    expect(styleClasses(css, "tree")).toEqual([
      { name: "m", mode: "tree" },
      { name: "g", mode: "tree" },
    ]);
  });

  test("ignores @keyframes", () => {
    expect(styleClasses("@keyframes spin { from { } to { } }", "tree")).toEqual([]);
  });

  test("dedupes by name and mode, keeping first-seen order", () => {
    const css = ".a .b { } .a { } .c { } @scoped { .a { } }";
    expect(styleClasses(css, "tree")).toEqual([
      { name: "a", mode: "tree" },
      { name: "b", mode: "tree" },
      { name: "c", mode: "tree" },
      { name: "a", mode: "scoped" },
    ]);
  });

  test("unescapes CSS escapes in names", () => {
    expect(styleClasses(".md\\:flex { }", "tree")).toEqual([{ name: "md:flex", mode: "tree" }]);
  });

  test("ignores dots inside attribute selectors", () => {
    expect(styleClasses('[href$=".pdf"] .x { }', "tree")).toEqual([{ name: "x", mode: "tree" }]);
  });
});

describe("markupClasses", () => {
  test("reads static class values", () => {
    const result = markupClasses('<div class="row is-active">hi</div>');
    expect(result.used).toEqual(new Set(["row", "is-active"]));
    expect(result.unsafeDynamic).toBe(false);
  });

  test("reads single-quoted static class values", () => {
    expect(markupClasses("<div class='one two'></div>").used).toEqual(new Set(["one", "two"]));
  });

  test("reads strings in the script section", () => {
    const source = "<script>const hidden = 'panel open'</script><p class=\"a\"></p>";
    expect(markupClasses(source).used).toEqual(new Set(["a", "panel", "open"]));
  });

  test("ignores style content", () => {
    const source = '<style>.from-style { color: red; }</style><p class="a"></p>';
    expect(markupClasses(source).used).toEqual(new Set(["a"]));
  });

  test("reads both branches of a ternary class", () => {
    const result = markupClasses(
      "<script>const a = true;</script>\n<p class={a ? 'done' : ''}></p>",
    );
    expect(result.used.has("done")).toBe(true);
    expect(result.unsafeDynamic).toBe(false);
  });

  test("reads classes returned by a helper", () => {
    const source = `<script>
  function rowClass(i) {
    return 'row is-active'
  }
</script>
<EACH {rows} index={i}><li class={rowClass(i)}></li></EACH>`;
    const result = markupClasses(source);
    expect(result.used.has("row")).toBe(true);
    expect(result.used.has("is-active")).toBe(true);
    expect(result.unsafeDynamic).toBe(false);
  });

  test("flags an interpolated static class whose value is imported", () => {
    const source = `<script>
import { tone } from "./variable.ts";
</script>
<li class="cell {tone}"></li>`;
    expect(markupClasses(source).unsafeDynamic).toBe(true);
  });

  test("keeps an interpolated static class safe when the value is declared locally", () => {
    const source = `<script>
const tone = 'odd';
</script>
<li class="cell {tone}"></li>`;
    const result = markupClasses(source);
    expect(result.used.has("odd")).toBe(true);
    expect(result.unsafeDynamic).toBe(false);
  });

  test("flags a class expression that reads an imported value", () => {
    const source = `<script>
import { active } from "./state.ts";
</script>
<li class={active ? 'on' : 'off'}></li>`;
    expect(markupClasses(source).unsafeDynamic).toBe(true);
  });

  test("keeps a class expression safe when it reads only loop items and properties", () => {
    const source = `<script>
const rows = [];
</script>
<EACH {rows} as={row}><li class={row.kind}></li></EACH>`;
    expect(markupClasses(source).unsafeDynamic).toBe(false);
  });

  test("flags string concatenation in a class expression", () => {
    expect(markupClasses("<p class={'is-' + x}></p>").unsafeDynamic).toBe(true);
  });

  test("flags a template literal with a hole in a class expression", () => {
    expect(markupClasses("<p class={`a ${b}`}></p>").unsafeDynamic).toBe(true);
  });

  test("flags concatenation in a script helper that the class calls", () => {
    const source = "<script>function f(x) { return 'is-' + x }</script><p class={f(x)}></p>";
    expect(markupClasses(source).unsafeDynamic).toBe(true);
  });

  test("returns false for a plain file", () => {
    const result = markupClasses("<p>hello</p>");
    expect(result.used.size).toBe(0);
    expect(result.unsafeDynamic).toBe(false);
  });

  test("a resolved literal union adds its classes and stays safe", () => {
    const source = `<script>\nimport { tone } from "./variable.ts";\n</script>\n<li class="cell {tone}"></li>`;
    const result = markupClasses(source, () => ["odd", "even"]);
    expect(result.used.has("odd")).toBe(true);
    expect(result.used.has("even")).toBe(true);
    expect(result.unsafeDynamic).toBe(false);
    expect(result.wide).toEqual([]);
  });

  test("a wide type is reported at its expression and makes the markup unsafe", () => {
    const source = `<script>\nimport { label } from "./variable.ts";\n</script>\n<li class={label}></li>`;
    const result = markupClasses(source, () => ({ wide: "string" }));
    expect(result.wide).toEqual([
      { name: "label", offset: source.indexOf("label}"), type: "string" },
    ]);
    expect(result.unsafeDynamic).toBe(true);
  });

  test("a prop with a literal union adds its choices and stays safe", () => {
    const source = `<script>\nimport { props } from "lusiajs";\nconst { tone } = props(class {\n  tone: "info" | "warn" = "info";\n});\n</script>\n<span class="badge {tone}"></span>`;
    const result = markupClasses(source);
    expect(result.used.has("info")).toBe(true);
    expect(result.used.has("warn")).toBe(true);
    expect(result.unsafeDynamic).toBe(false);
  });

  test("a prop without choices is unsafe", () => {
    const source = `<script>\nimport { props } from "lusiajs";\nconst { tone } = props(class {\n  tone = "info";\n});\n</script>\n<span class="badge {tone}"></span>`;
    expect(markupClasses(source).unsafeDynamic).toBe(true);
  });

  test("an object-form prop with a literal union adds its choices and stays safe", () => {
    const source = `<script>\nimport { props } from "lusiajs";\nconst p = props(class {\n  tone: "info" | "warn" = "info";\n});\n</script>\n<span class="badge {p.tone}"></span>`;
    const result = markupClasses(source);
    expect(result.used.has("warn")).toBe(true);
    expect(result.unsafeDynamic).toBe(false);
  });

  test("a prop read that is not declared is unsafe", () => {
    expect(markupClasses('<span class="badge {props.tone}"></span>').unsafeDynamic).toBe(true);
  });
});
