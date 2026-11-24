import { expect, test } from "bun:test";
import { compileLintScss } from "#language/lint/rules/style-compile.browser.ts";

const LINT_ENTRY = new URL("../../../../src/language/lint/lint.ts", import.meta.url).pathname;

// The docs editor lints in the browser, so the linter must bundle without Node-only modules.
test("the linter bundles for the browser without Sass", async () => {
  const result = await Bun.build({ entrypoints: [LINT_ENTRY], target: "browser" });
  expect(result.logs.filter((log) => log.level === "error")).toEqual([]);
  expect(result.success).toBe(true);
  const code = await result.outputs[0]!.text();
  expect(code).not.toContain("compileString");
});

test("the browser style step compiles nothing, so unused-class stays quiet on SCSS", () => {
  expect(compileLintScss(".a { .b { color: red; } }", "/App.lusia")).toBeUndefined();
});
