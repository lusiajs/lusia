import { describe, expect, test } from "bun:test";
import { lintLusia, type LintOptions } from "#language/lint/lint.ts";
import type { ChildSourceLookup } from "#language/lint/types.ts";

const NO_PROPS = () => undefined;

// Components by name. Each child sees the same map for its own imports.
function componentsLookup(components: Record<string, string>): ChildSourceLookup {
  return (name) => {
    const source = components[name];
    if (source === undefined) return undefined;
    return { path: name, source, childSource: componentsLookup(components) };
  };
}

function unusedClasses(
  source: string,
  components: Record<string, string> = {},
  options?: LintOptions,
): Array<[string, number]> {
  return lintLusia(source, NO_PROPS, options, componentsLookup(components))
    .filter((issue) => issue.code === "unused-class")
    .map((issue) => [issue.message, issue.line]);
}

const LEAF_IMPORT = '<script>\nimport Leaf from "./leaf.lusia";\n</script>\n';

describe("unused-class", () => {
  test("warns on a class that no markup uses, with its line", () => {
    const source =
      '<style>\n.used { color: red; }\n.unused { color: red; }\n</style>\n<p class="used"></p>';
    expect(unusedClasses(source)).toEqual([['".unused" is never used in markup', 3]]);
  });

  test("warns with the warning severity", () => {
    const issues = lintLusia(
      "<style>\n.a { color: red; }\n</style>",
      NO_PROPS,
      undefined,
      componentsLookup({}),
    );
    expect(issues.map((issue) => issue.severity)).toEqual(["warning"]);
  });

  test("a class used as a static class is not flagged", () => {
    expect(unusedClasses('<style>.a { }</style>\n<p class="a b"></p>')).toEqual([]);
  });

  test("a class in a ternary string is not flagged", () => {
    const source = `<script>\nconst active = true;\n</script>\n<style>.on { color: red; } .off { color: red; }</style>\n<p class={active ? "on" : "off"}></p>`;
    expect(unusedClasses(source)).toEqual([]);
  });

  test("a class returned by a helper function string is not flagged", () => {
    const source = `<script>\nfunction badge(name) { return name; }\n</script>\n<style>.pill { color: red; }</style>\n<p class={badge("pill")}></p>`;
    expect(unusedClasses(source)).toEqual([]);
  });

  test("a class value from an import silences the rule", () => {
    const source = `<script>\nimport { tone } from "./variable.ts";\n</script>\n<style>.odd { color: red; }</style>\n<p class="cell {tone}"></p>`;
    expect(unusedClasses(source)).toEqual([]);
  });

  test("a tree-mode class used only in a child is not flagged", () => {
    const source = `${LEAF_IMPORT}<style>.card { color: red; }</style>\n<Leaf />`;
    expect(unusedClasses(source, { Leaf: '<p class="card">x</p>' })).toEqual([]);
  });

  test("a tree-mode class used only in a grandchild is not flagged", () => {
    const source = `${LEAF_IMPORT}<style>.card { }</style>\n<Leaf />`;
    const components = {
      Leaf: '<script>\nimport Mid from "./mid.lusia";\n</script>\n<Mid />',
      Mid: '<p class="card">x</p>',
    };
    expect(unusedClasses(source, components)).toEqual([]);
  });

  test("a scoped-mode class used only in a child is flagged", () => {
    const source = `${LEAF_IMPORT}<style scoped>.card { color: red; }</style>\n<Leaf />`;
    expect(unusedClasses(source, { Leaf: '<p class="card">x</p>' })).toEqual([
      ['".card" is never used in markup', 4],
    ]);
  });

  test("a :global() selector is skipped", () => {
    expect(unusedClasses("<style>:global(.x) { }</style>\n<p></p>")).toEqual([]);
  });

  test("a global style section is skipped", () => {
    expect(unusedClasses("<style global>.x { }</style>\n<p></p>")).toEqual([]);
  });

  test("a SCSS nested &-item selector resolves to the compiled class", () => {
    const source = '<style>.list { &-item { color: red; } }</style>\n<p class="list-item"></p>';
    expect(unusedClasses(source)).toEqual([]);
  });

  test("a rule set to off is skipped", () => {
    const source = "<style>.unused { color: red; }</style>\n<p></p>";
    expect(unusedClasses(source, {}, { rules: { "unused-class": "off" } })).toEqual([]);
  });

  test("an HTML disable comment hides the finding", () => {
    const source =
      "<!-- lusia-lint-disable unused-class -->\n<style>.a { color: red; }</style>\n<p></p>";
    expect(unusedClasses(source)).toEqual([]);
  });

  test("a CSS disable comment hides the rest of the style", () => {
    const source =
      "<style>\n/* lusia-lint-disable unused-class */\n.a { color: red; }\n</style>\n<p></p>";
    expect(unusedClasses(source)).toEqual([]);
  });

  test("a CSS disable-next-line comment hides only the next line", () => {
    const source =
      "<style>\n/* lusia-lint-disable-next-line unused-class */\n.a { color: red; }\n.b { color: red; }\n</style>\n<p></p>";
    expect(unusedClasses(source)).toEqual([['".b" is never used in markup', 4]]);
  });
});
