import { describe, expect, test } from "bun:test";
import { compile, hash } from "#compiler/index.ts";

const FILE = `${process.cwd()}/test/compiler/Marked.lusia`;
const ID = hash(FILE);
const MARKER = `l-${ID}`;
const ROOT = `[data-l="${ID}"]`;
const CHILD_IMPORT = `<script>\nimport Child from "./Child.lusia";\n</script>\n`;

describe("class marker on owned markup", () => {
  test("every element gets the marker, including ones inside IF and EACH", () => {
    const { code } = compile(
      `<script>\nconst on = variable(true);\nconst items = variable([1]);\n</script>\n` +
        `<div><IF {on}><p>a</p></IF><EACH {items} as={item}><span>{item}</span></EACH></div>\n` +
        `<style scoped>p { color: red; }</style>`,
      FILE,
    );
    expect(code).toContain(`<div class=\\"${MARKER}\\">`);
    expect(code).toContain(`<p class=\\"${MARKER}\\">a</p>`);
    expect(code).toContain(`<span class=\\"${MARKER}\\">`);
  });

  test("a static class is merged with the marker", () => {
    const { code } = compile(
      `<div class="box">x</div>\n<style scoped>.box { color: red; }</style>`,
      FILE,
    );
    expect(code).toContain(`class=\\"${MARKER} box\\"`);
  });

  test("a dynamic class keeps the marker by concatenation", () => {
    const { code } = compile(
      `<script>\nconst tone = variable("warm");\n</script>\n` +
        `<div class={tone}>x</div>\n<style scoped>.warm { color: red; }</style>`,
      FILE,
    );
    expect(code).toContain(`"${MARKER} " + __toText(__unwrap((tone)))`);
  });

  test("an element without a class gets a new class attribute", () => {
    const { code } = compile(`<p>x</p>\n<style scoped>p { color: red; }</style>`, FILE);
    expect(code).toContain(`<p class=\\"${MARKER}\\">x</p>`);
  });
});

describe("unmarked components", () => {
  test("a component that imports another .lusia stays unmarked", () => {
    const { code, css } = compile(
      `${CHILD_IMPORT}<div><Child /></div>\n<style scoped>div { color: red; }</style>`,
      FILE,
    );
    expect(code).not.toContain(MARKER);
    expect(css).toContain(`[data-l="${ID}"]`);
  });

  test("a component with <CONTENT /> stays unmarked", () => {
    const { code, css } = compile(
      `<div><CONTENT /></div>\n<style scoped>div { color: red; }</style>`,
      FILE,
    );
    expect(code).not.toContain(MARKER);
    expect(css).toContain(ROOT);
  });

  test("a component with <HTML> stays unmarked", () => {
    const { code, css } = compile(
      `<script>\nconst body = variable("<b>x</b>");\n</script>\n` +
        `<div><HTML>{body}</HTML></div>\n<style scoped>div { color: red; }</style>`,
      FILE,
    );
    expect(code).not.toContain(MARKER);
    expect(css).toContain(ROOT);
  });

  test("a component with only global styles stays unmarked", () => {
    const { code, css } = compile(`<p>x</p>\n<style global>body { margin: 0; }</style>`, FILE);
    expect(code).not.toContain(MARKER);
    expect(css).toContain("body {");
    expect(css).not.toContain(":where(");
  });
});

describe("selectors", () => {
  test("scoped style uses the class filter", () => {
    const { css } = compile(`<p>x</p>\n<style scoped>p { color: red; }</style>`, FILE);
    expect(css).toContain(`p:where(.${MARKER})`);
    expect(css).not.toContain(ROOT);
  });

  test("tree style uses the class filter too", () => {
    const { css } = compile(`<h1>x</h1>\n<style>h1 { color: red; }</style>`, FILE);
    expect(css).toContain(`h1:where(.${MARKER})`);
    expect(css).not.toContain(ROOT);
  });

  test("@scoped block in a tree style uses the class filter", () => {
    const { css } = compile(
      `<h1>x</h1><div class="card">y</div>\n` +
        `<style>h1 { color: red; }\n@scoped { .card { padding: 1rem; } }</style>`,
      FILE,
    );
    expect(css).toContain(`h1:where(.${MARKER})`);
    expect(css).toContain(`.card:where(.${MARKER})`);
  });
});
