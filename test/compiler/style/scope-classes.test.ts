import { describe, expect, test } from "bun:test";
import { compile, hash } from "#compiler/index.ts";
import { scopeClassesOf } from "#compiler/style/scope-classes.ts";

const FILE = `${process.cwd()}/test/compiler/Classes.lusia`;
const ID = hash(FILE);
const SCOPED = `_l${ID}`;
const TREE = `_t${ID}`;
const SCRIPT = `<script>\nconst on = variable(true);\nconst items = variable([1]);\n</script>\n`;

describe("scopeClassesOf", () => {
  test("names only the classes the css uses", () => {
    expect(scopeClassesOf(`.a:where(.${TREE}) {}`, ID)).toEqual({ scoped: "", tree: TREE });
    expect(scopeClassesOf(`.a:where(.${SCOPED}) {}`, ID)).toEqual({ scoped: SCOPED, tree: "" });
  });

  test("names nothing for css without scoped rules", () => {
    expect(scopeClassesOf("body { margin: 0; }", ID)).toEqual({ scoped: "", tree: "" });
  });
});

describe("class scoping in the template", () => {
  test("a component without styles adds no classes", () => {
    const { code } = compile(`<p class="a">x</p>`, FILE);
    expect(code).toContain(`<p class=\\"a\\">x</p>`);
    expect(code).not.toContain(SCOPED);
    expect(code).not.toContain(TREE);
  });

  test("a tree rule adds the tree class to every element", () => {
    const { code } = compile(`<p>x</p>\n<style>p { color: red; }</style>`, FILE);
    expect(code).toContain(`<p class=\\"${TREE}\\">x</p>`);
    expect(code).not.toContain(SCOPED);
  });

  test("a scoped rule adds only the scoped class", () => {
    const { code } = compile(`<p>x</p>\n<style scoped>p { color: red; }</style>`, FILE);
    expect(code).toContain(`<p class=\\"${SCOPED}\\">x</p>`);
    expect(code).not.toContain(TREE);
  });

  test("both modes add both classes, merged with a static class", () => {
    const { code } = compile(
      `<p class="a">x</p>\n<style>.a { color: red; }\n@scoped { .a { color: blue; } }</style>`,
      FILE,
    );
    expect(code).toContain(`<p class=\\"${SCOPED} ${TREE} a\\">x</p>`);
  });

  test("elements inside IF, EACH and component children get the classes", () => {
    const { code } = compile(
      `${SCRIPT}<div><IF {on}><p>a</p></IF><EACH {items} as={item}><span>{item}</span></EACH></div>\n` +
        `<style scoped>p { color: red; }</style>`,
      FILE,
    );
    expect(code).toContain(`<div class=\\"${SCOPED}\\">`);
    expect(code).toContain(`<p class=\\"${SCOPED}\\">a</p>`);
    expect(code).toContain(`<span class=\\"${SCOPED}\\">`);
  });

  test("a dynamic class keeps the inherited tree classes", () => {
    const { code } = compile(
      `${SCRIPT}<p class="{on.value ? 'a' : 'b'}">x</p>\n<style>p { color: red; }</style>`,
      FILE,
    );
    expect(code).toContain("__withInheritedClasses(");
  });

  test("a component passes its tree class to the children it renders", () => {
    const { code } = compile(
      `<script>\nimport Child from "./Child.lusia";\n</script>\n<Child />\n<style>p { color: red; }</style>`,
      FILE,
    );
    expect(code).toContain(`__joinClasses(__host.inherited, "${TREE}")`);
  });

  test("html bindings get the component's own classes", () => {
    const { code } = compile(
      `${SCRIPT}<HTML>{on}</HTML>\n<style scoped>p { color: red; }</style>`,
      FILE,
    );
    expect(code).toContain(`__joinClasses("${SCOPED}", __host.inherited)`);
  });
});
