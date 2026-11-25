import { describe, expect, test } from "bun:test";
import { lintLusia } from "#language/lint/lint.ts";
import { parsePropDefs } from "#language/parse/props.ts";

const BADGE = `<script>
import { props } from "lusiajs";
const { tone } = props(class {
  tone: "info" | "warn" = "info";
});
</script>
<span class="badge {tone}"></span>
`;
const IMPORT = '<script>\nimport Badge from "./badge.lusia";\n</script>\n';

function choiceIssues(source: string) {
  const childProps = (name: string) => (name === "Badge" ? parsePropDefs(BADGE) : undefined);
  return lintLusia(source, childProps)
    .filter((issue) => issue.code === "prop-choice")
    .map((issue) => [issue.message, issue.line]);
}

describe("prop-choice", () => {
  test("flags a static value that is not a choice", () => {
    expect(choiceIssues(`${IMPORT}<Badge tone="danger" />`)).toEqual([
      ['"danger" is not a choice for tone. Use one of: "info", "warn".', 4],
    ]);
  });

  test("accepts a static value that is a choice", () => {
    expect(choiceIssues(`${IMPORT}<Badge tone="warn" />`)).toEqual([]);
  });

  test("skips an expression value", () => {
    expect(choiceIssues(`${IMPORT}<Badge tone={mode} />`)).toEqual([]);
  });

  test("skips a bind attribute", () => {
    expect(choiceIssues(`${IMPORT}<Badge bind-tone={mode} />`)).toEqual([]);
  });

  test("skips a prop without choices", () => {
    const childProps = () =>
      parsePropDefs('<script>\nimport { props } from "lusiajs";\nconst { tone } = props(class {\n  tone = "info";\n});\n</script>');
    const issues = lintLusia(`${IMPORT}<Badge tone="danger" />`, childProps);
    expect(issues.map((issue) => issue.code)).toEqual([]);
  });
});
