import { describe, expect, test } from "bun:test";
import {
  importedSymbolAt,
  importedSymbols,
  type SymbolLookup,
} from "../../../src/editor/script/imported-symbols.ts";
import type { ScriptSymbol } from "../../../src/editor/script/symbols.ts";

function symbol(name: string, isDefault = false): ScriptSymbol {
  return {
    name,
    kind: "function",
    signature: `function ${name}(): void`,
    isDefault,
    doc: "",
    specifier: "./mod.ts",
  };
}

const lookup: SymbolLookup = () => [symbol("add"), symbol("format"), symbol("default", true)];

describe("importedSymbols", () => {
  test("reads a named import", () => {
    const script = 'import { add } from "./math.ts";';
    expect(importedSymbols(script, lookup)).toEqual([{ local: "add", symbol: symbol("add") }]);
  });

  test("reads a named import under its alias", () => {
    const script = 'import { add as sum } from "./math.ts";';
    expect(importedSymbols(script, lookup).map((item) => item.local)).toEqual(["sum"]);
    expect(importedSymbols(script, lookup)[0]?.symbol.name).toBe("add");
  });

  test("reads a type-only import", () => {
    const script = 'import type { format } from "./text.ts";';
    expect(importedSymbols(script, lookup).map((item) => item.local)).toEqual(["format"]);
  });

  test("reads a default import from the default export", () => {
    const script = 'import make from "./mod.ts";';
    expect(importedSymbols(script, lookup)).toEqual([
      { local: "make", symbol: symbol("default", true) },
    ]);
  });

  test("falls back to a symbol named like the default import", () => {
    const script = 'import format from "./mod.ts";';
    expect(importedSymbols(script, () => [symbol("format")])[0]?.symbol.name).toBe("format");
  });

  test("skips namespace and side-effect imports", () => {
    const script = `import * as math from "./math.ts";
import "./style.css";`;
    expect(importedSymbols(script, lookup)).toEqual([]);
  });

  test("yields nothing when the lookup returns nothing", () => {
    expect(importedSymbols('import { add } from "./math.ts";', () => [])).toEqual([]);
  });

  test("never throws when the lookup throws", () => {
    const script = 'import { add } from "./math.ts";';
    expect(
      importedSymbols(script, () => {
        throw new Error("no file");
      }),
    ).toEqual([]);
  });
});

describe("importedSymbolAt", () => {
  test("finds the symbol behind a local name", () => {
    const script = 'import { add as sum } from "./math.ts";';
    expect(importedSymbolAt(script, "sum", lookup)?.symbol.name).toBe("add");
    expect(importedSymbolAt(script, "missing", lookup)).toBeUndefined();
  });
});
