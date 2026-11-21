import { describe, expect, test } from "bun:test";
import { hotVariables } from "#compiler/hot/variables.ts";

describe("hotVariables", () => {
  test("wraps a top-level variable declaration with its name", () => {
    expect(hotVariables("const count = variable(0);")).toBe(
      'const count = __hotVariable("count", variable(0));',
    );
  });

  test("keeps type arguments inside the wrapped call", () => {
    expect(hotVariables("let total = variable<number>(0);")).toBe(
      'let total = __hotVariable("total", variable<number>(0));',
    );
  });

  test("wraps each declaration of the script", () => {
    const script = "const a = variable(1);\nconst b = variable({ x: [1, 2] });\n";
    expect(hotVariables(script)).toBe(
      'const a = __hotVariable("a", variable(1));\nconst b = __hotVariable("b", variable({ x: [1, 2] }));\n',
    );
  });

  test("leaves variables inside functions and derived variables alone", () => {
    const script =
      "function make() { const inner = variable(1); return inner; }\nconst d = variable.compute(() => 1);";
    expect(hotVariables(script)).toBe(script);
  });

  test("ignores variable calls inside strings and comments", () => {
    const script =
      'const text = ")variable(";\n// const fake = variable(2);\nconst real = variable(3);';
    expect(hotVariables(script)).toBe(
      'const text = ")variable(";\n// const fake = variable(2);\nconst real = __hotVariable("real", variable(3));',
    );
  });
});
