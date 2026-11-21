import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { lintLusia, type LintOptions } from "#language/lint/lint.ts";
import { applyFixes } from "#language/lint/fixes.ts";
import { parsePropDefs, type PropDef } from "#language/parse/props.ts";

const BADGE = join(import.meta.dir, "fixtures/badge.lusia");
const BADGE_PROPS = parsePropDefs(readFileSync(BADGE, "utf8"));
const BADGE_IMPORT = '<script>\nimport Badge from "./badge.lusia";\n</script>\n';

function childProps(name: string): PropDef[] | undefined {
  return name === "Badge" ? BADGE_PROPS : undefined;
}

function codes(source: string, options?: LintOptions): string[] {
  return lintLusia(source, childProps, options).map((issue) => issue.code);
}

describe("lint rules", () => {
  test("unused-import flags a component that is never used as a tag", () => {
    const issues = lintLusia(`${BADGE_IMPORT}<p>hi</p>`, childProps);
    expect(issues).toEqual([
      {
        line: 2,
        column: 1,
        message: '"Badge" is imported but never used',
        severity: "warning",
        code: "unused-import",
        fix: { start: 9, end: 44, text: "" },
      },
    ]);
  });

  test("a used component import is not flagged", () => {
    expect(codes(`${BADGE_IMPORT}<Badge label="Done" />`)).toEqual([]);
  });

  test("a component used as a value is not flagged", () => {
    const source = `<script>
import Badge from "./badge.lusia";
import { attach } from "lusiajs";
attach(Badge, document.body);
</script>`;
    expect(codes(source)).toEqual([]);
  });

  test("props-twice flags the second props() call", () => {
    const source =
      '<script>\nimport { props } from "lusiajs";\nprops({ a: 1 });\nprops({ b: 2 });\n</script>';
    const issues = lintLusia(source, childProps);
    expect(issues.map((issue) => [issue.code, issue.line])).toEqual([["props-twice", 4]]);
  });

  test("unknown-prop flags an attribute the child does not declare", () => {
    const issues = lintLusia(`${BADGE_IMPORT}<p>x</p>\n<Badge label="x" size="2" />`, childProps);
    expect(issues.map((issue) => [issue.code, issue.line])).toEqual([["unknown-prop", 5]]);
    expect(issues[0]?.message).toContain('"size"');
  });

  test("unknown-prop skips a component whose file cannot be read", () => {
    const source = '<script>\nimport Ghost from "./ghost.lusia";\n</script>\n<Ghost size="2" />';
    expect(codes(source)).toEqual([]);
  });

  test("empty-expression flags {} in markup", () => {
    const issues = lintLusia("<p>{ }</p>", childProps);
    expect(issues.map((issue) => [issue.code, issue.line, issue.column])).toEqual([
      ["empty-expression", 1, 4],
    ]);
  });

  test("braces in the script are not markup", () => {
    expect(codes("<script>\nconst x = {};\n</script>\n<p>{x}</p>")).toEqual([]);
  });

  test("style-attribute flags an unknown <style> attribute", () => {
    const issues = lintLusia(
      "<style scoped>\n.a {}\n</style>\n<style foo global>\n.b {}\n</style>",
      childProps,
    );
    expect(issues.map((issue) => issue.code)).toEqual(["style-attribute"]);
    expect(issues[0]?.message).toContain('"foo"');
  });

  test("known <style> attributes pass", () => {
    expect(codes('<style lang="css" scoped>\n.a {}\n</style>')).toEqual([]);
  });

  test("animate-keyframes flags a static animate value", () => {
    const issues = lintLusia('<div animate="fade">x</div>', childProps);
    expect(issues.map((issue) => [issue.code, issue.severity])).toEqual([
      ["animate-keyframes", "error"],
    ]);
    expect(issues[0]?.message).toBe("animate needs {keyframes}");
  });

  test("animate-keyframes flags a bare animate attribute", () => {
    expect(codes("<div animate>x</div>")).toEqual(["animate-keyframes"]);
  });

  test("an expression animate passes, and the trigger words are not checked", () => {
    expect(
      codes(
        "<div animate={[{ animation: fade, active: ACTIVE.VIEW, once: true }]} duration={300}>x</div>",
      ),
    ).toEqual([]);
  });

  test("animate-key flags a typo of default in keyframes kept in the script", () => {
    const source =
      "<script>\nconst fadeUp = { defaut: [EASE.OUT], 0: { opacity: 0 }, 1: { opacity: 1 } };\n</script>\n<div animate={fadeUp}>x</div>";
    const issues = lintLusia(source, childProps);
    expect(issues).toEqual([
      {
        line: 2,
        column: 18,
        message:
          "unknown keyframes key 'defaut'. Keys are numbers from 0 to 1 or 'default' (did you mean 'default'?)",
        severity: "error",
        code: "animate-key",
      },
    ]);
  });

  test("animate-key flags a typo of an item key", () => {
    expect(codes("<div animate={{ style: fade, durtion: 400 }}>x</div>")).toEqual(["animate-key"]);
  });

  test("animate-keyframes skips a component tag, whose animate is a prop", () => {
    expect(codes(`${BADGE_IMPORT}<Badge animate="x" />`)).not.toContain("animate-keyframes");
  });
});

describe("flow and bind-value lint rules", () => {
  test("flow-chain flags an ELSE with no IF before it", () => {
    const issues = lintLusia("<p>x</p>\n<ELSE>\n<p>y</p>\n</ELSE>", childProps);
    expect(issues.map((issue) => [issue.code, issue.severity, issue.line])).toEqual([
      ["flow-chain", "error", 2],
    ]);
    expect(issues[0]?.message).toBe("<ELSE> must come right after </IF> or </ELSEIF>");
  });

  test("flow-chain passes ELSEIF and ELSE right after a branch", () => {
    const source = "<IF {a}>\n</IF>\n<ELSEIF {b}>\n</ELSEIF>\n<ELSE>\n</ELSE>";
    expect(codes(source)).toEqual([]);
  });

  test("flow-chain flags an ELSE after other markup", () => {
    expect(codes("<IF {a}>\n</IF>\n<p>gap</p>\n<ELSE>\n</ELSE>")).toEqual(["flow-chain"]);
  });

  test("bind-target flags bind-value on a plain tag that is not a form control", () => {
    const issues = lintLusia("<p bind-value={name}>x</p>", childProps);
    expect(issues.map((issue) => [issue.code, issue.severity])).toEqual([["bind-target", "error"]]);
    expect(issues[0]?.message).toBe(
      "bind-value works on input, textarea and select; use bind-<property>",
    );
  });

  test("bind-target passes bind-value on input, textarea and select", () => {
    expect(
      codes(
        "<input bind-value={a} /><textarea bind-value={b}></textarea><select bind-value={c}></select>",
      ),
    ).toEqual([]);
  });

  test("bind-target passes bind-value on a component tag, which writes back to the variable", () => {
    expect(codes(`${BADGE_IMPORT}<Badge bind-value={name} />`)).not.toContain("bind-target");
  });

  test("bind-target flags bind-element on a component tag", () => {
    const issues = lintLusia(`${BADGE_IMPORT}<Badge bind-element={el} />`, childProps);
    expect(issues.find((issue) => issue.code === "bind-target")?.message).toBe(
      "bind-element works on elements only",
    );
  });

  test("unknown-prop reads bind-<prop> as the prop it binds", () => {
    const issues = lintLusia(`${BADGE_IMPORT}<Badge bind-tone={mode} />`, childProps);
    expect(issues.map((issue) => [issue.code, issue.line])).toEqual([]);
  });

  test("bind-target passes bind-<prop> and bind-element on any tag", () => {
    expect(codes("<p bind-element={el} bind-text-content={x}>y</p>")).toEqual([]);
  });

  test("scroll-numeric-line flags a numeric start or end in a file that uses WHEN.SCROLL", () => {
    const source =
      "<div animate={{ when: WHEN.SCROLL, more: { start: 0.2, end: SCROLL_AT.LEAVE } }}>";
    expect(lintLusia(source, childProps).map((issue) => [issue.code, issue.column])).toEqual([
      ["scroll-numeric-line", 44],
    ]);
  });

  test("scroll-numeric-line ignores files without WHEN.SCROLL", () => {
    expect(codes("<div animate={{ when: WHEN.VIEW, more: { start: 0.2 } }}>")).not.toContain(
      "scroll-numeric-line",
    );
  });
});

describe("lint options", () => {
  test("a configured level overrides the rule's own severity", () => {
    const issues = lintLusia('<div animate="fade">x</div>', childProps, {
      rules: { "animate-keyframes": "warn" },
    });
    expect(issues.map((issue) => issue.severity)).toEqual(["warning"]);
    expect(
      lintLusia("<p>{ }</p>", childProps, {
        rules: { "empty-expression": "error" },
      }).map((issue) => issue.severity),
    ).toEqual(["error"]);
  });

  test("off skips the rule", () => {
    expect(
      codes('<div animate="fade">x</div>', {
        rules: { "animate-keyframes": "off" },
      }),
    ).toEqual([]);
    expect(codes(`${BADGE_IMPORT}<p>hi</p>`, { rules: { "unused-import": "off" } })).toEqual([]);
  });

  test("an empty settings object keeps the defaults", () => {
    expect(codes('<div animate="fade">x</div>', { rules: {} })).toEqual(["animate-keyframes"]);
  });
});

describe("lint disable comments", () => {
  test("disable-next-line hides the finding on the next line only", () => {
    const source =
      "<p>{ }</p>\n<!-- lusia-lint-disable-next-line empty-expression -->\n<p>{ }</p>\n";
    expect(lintLusia(source, childProps).map((issue) => issue.line)).toEqual([1]);
  });

  test("disable hides the rest of the file", () => {
    const source = "<!-- lusia-lint-disable empty-expression -->\n<p>{ }</p>\n<p>{ }</p>\n";
    expect(lintLusia(source, childProps)).toEqual([]);
  });

  test("a disable comment names only its rules", () => {
    const source = "<!-- lusia-lint-disable empty-expression -->\n<p>{ }</p>\n<ELSE>\n</ELSE>\n";
    expect(codes(source)).toEqual(["flow-chain"]);
  });

  test("a disable comment with no code turns every rule off", () => {
    const source = "<!-- lusia-lint-disable -->\n<p>{ }</p>\n<ELSE>\n</ELSE>\n";
    expect(lintLusia(source, childProps)).toEqual([]);
  });

  test("disableComments: false ignores the comments", () => {
    const source = "<!-- lusia-lint-disable -->\n<p>{ }</p>\n";
    expect(codes(source, { disableComments: false })).toEqual(["empty-expression"]);
  });
});

describe("lint fixes", () => {
  test("unused-import removes the whole import line", () => {
    const source = `${BADGE_IMPORT}<p>hi</p>`;
    expect(applyFixes(source, lintLusia(source, childProps))).toBe(
      "<script>\n</script>\n<p>hi</p>",
    );
  });

  test("a finding with no fix leaves the source alone", () => {
    const source = "<p>{ }</p>";
    expect(applyFixes(source, lintLusia(source, childProps))).toBe(source);
  });
});
