import { describe, expect, test } from "bun:test";
import { parseScriptImports } from "#integrations/vscode-support/script/import-declarations.ts";

describe("parseScriptImports", () => {
  test("reads a default import", () => {
    expect(parseScriptImports('import Def from "./x.ts";')).toEqual([
      { specifier: "./x.ts", names: [], defaultName: "Def" },
    ]);
  });

  test("reads named, aliased and type-only names across lines", () => {
    const script = `import {
  a,
  b as c,
  type D,
} from './mod.ts';`;
    expect(parseScriptImports(script)).toEqual([
      {
        specifier: "./mod.ts",
        names: [
          { imported: "a", local: "a", typeOnly: false },
          { imported: "b", local: "c", typeOnly: false },
          { imported: "D", local: "D", typeOnly: true },
        ],
      },
    ]);
  });

  test("reads a default import next to a named list", () => {
    expect(parseScriptImports('import Def, { a } from "./x.ts";')).toEqual([
      {
        specifier: "./x.ts",
        names: [{ imported: "a", local: "a", typeOnly: false }],
        defaultName: "Def",
      },
    ]);
  });

  test("reads a namespace import", () => {
    expect(parseScriptImports('import * as ns from "./x.ts";')).toEqual([
      { specifier: "./x.ts", names: [], namespaceName: "ns" },
    ]);
  });

  test("reads a side-effect import", () => {
    expect(parseScriptImports('import "./setup.ts";')).toEqual([
      { specifier: "./setup.ts", names: [] },
    ]);
  });

  test("marks every name of an import type clause", () => {
    expect(parseScriptImports('import type { A, B } from "./types.ts";')).toEqual([
      {
        specifier: "./types.ts",
        names: [
          { imported: "A", local: "A", typeOnly: true },
          { imported: "B", local: "B", typeOnly: true },
        ],
      },
    ]);
  });

  test("keeps a type-only default import readable", () => {
    expect(parseScriptImports('import type Model from "./model.ts";')).toEqual([
      { specifier: "./model.ts", names: [], defaultName: "Model" },
    ]);
  });

  test("ignores dynamic imports", () => {
    expect(parseScriptImports('const mod = await import("./x.ts");')).toEqual([]);
  });

  test("ignores import-looking text in comments and strings", () => {
    const script = `// import A from "./a.ts";
const text = 'import B from "./b.ts"';
const meta = import.meta.url;
import C from "./c.ts";`;
    expect(parseScriptImports(script)).toEqual([
      { specifier: "./c.ts", names: [], defaultName: "C" },
    ]);
  });

  test("reads an import after other code on the same line", () => {
    expect(parseScriptImports('const x = 1; import A from "./a.ts";')).toEqual([
      { specifier: "./a.ts", names: [], defaultName: "A" },
    ]);
  });

  test("keeps the specifier extension as written", () => {
    expect(parseScriptImports('import { a } from "./deep/mod.js";')[0]?.specifier).toBe(
      "./deep/mod.js",
    );
  });
});
