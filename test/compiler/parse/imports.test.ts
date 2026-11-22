import { describe, expect, test } from "bun:test";
import { splitImports } from "#compiler/parse/imports.ts";
import { parse } from "#compiler/parse/sections.ts";
import { catchError } from "../catch-error.ts";

const FILE = "Card.lusia";

function split(script: string) {
  return splitImports(parse(`<script>${script}</script>`, FILE).script, FILE);
}

describe("splitImports", () => {
  test("hoists import statements and keeps the rest in the body", () => {
    const { imports, body } = split(
      '\nimport { variable } from "lusiajs";\nconst count = variable(0);\nimport a from "./a.ts";\n',
    );
    expect(imports).toBe('import { variable } from "lusiajs";\nimport a from "./a.ts";');
    expect(body).toContain("const count = variable(0);");
    expect(body).not.toContain("import");
  });

  test("a multi-line import is hoisted whole", () => {
    const { imports, body } = split(
      '\nimport {\n  variable,\n  attach,\n} from "lusiajs";\nconst a = 1;\n',
    );
    expect(imports).toBe('import {\n  variable,\n  attach,\n} from "lusiajs";');
    expect(body).toContain("const a = 1;");
  });

  test("default imports of .lusia files become component names", () => {
    const { components } = split(
      '\nimport Card from "./card.lusia";\nimport badge from "./badge.lusia";\n',
    );
    expect([...components]).toEqual(["Card", "badge"]);
  });

  test("a default import alongside named imports is a component", () => {
    const { components } = split('\nimport card, { b } from "./card.lusia";\n');
    expect([...components]).toEqual(["card"]);
  });

  test("default imports of other files are not components", () => {
    const { components } = split(
      '\nimport variable from "./variable.ts";\nimport * as ns from "./ns.lusia";\n',
    );
    expect(components.size).toBe(0);
  });

  test("named and side-effect imports of .lusia files are not components", () => {
    const { components } = split(
      '\nimport { card } from "./card.lusia";\nimport "./side.lusia";\n',
    );
    expect(components.size).toBe(0);
  });

  test("import type is ignored for components", () => {
    const { components } = split(
      '\nimport type Props from "./props.lusia";\nimport type { Shape } from "./shape.lusia";\n',
    );
    expect(components.size).toBe(0);
  });

  test("lowercase names that are not HTML tags are components", () => {
    const { components } = split(
      '\nimport row from "./row.lusia";\nimport myThing from "./my-thing.lusia";\n',
    );
    expect([...components]).toEqual(["row", "myThing"]);
  });

  test.each([
    ["button", "ButtonBox"],
    ["Button", "ButtonBox"],
    ["svg", "SvgBox"],
    ["foreignObject", "ForeignObjectBox"],
    ["math", "MathBox"],
  ])("%s is an HTML tag and cannot be a component name", (name, suggestion) => {
    const error = catchError(() => split(`\nimport ${name} from "./${name}.lusia";\n`));
    expect(error.code).toBe("L1046");
    expect(error.message).toBe(`"${name}" is an HTML tag, so it cannot be a component name`);
    expect(error.hint).toContain(`import ${suggestion} from`);
    expect(error.line).toBe(2);
    expect(error.column).toBe(1);
  });

  test("the reserved IF name is still L1004", () => {
    const error = catchError(() => split('\nimport IF from "./if.lusia";\n'));
    expect(error.code).toBe("L1004");
  });

  test("an export in the script is an error with its line and column", () => {
    const error = catchError(() => split("\nconst a = 1;\nexport const b = 2;\n"));
    expect(error.code).toBe("L1003");
    expect(error.message).toBe("a component's <script> cannot export");
    expect(error.file).toBe(FILE);
    expect(error.line).toBe(3);
    expect(error.column).toBe(1);
  });

  test("an indented export reports the column of the keyword", () => {
    const error = catchError(() => split("\n  export const b = 2;\n"));
    expect(error.line).toBe(2);
    expect(error.column).toBe(3);
  });

  test("a missing script gives empty parts", () => {
    expect(splitImports(null, FILE)).toEqual({
      imports: "",
      statements: [],
      body: "",
      components: new Set(),
    });
  });
});
