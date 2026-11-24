import { describe, expect, test } from "bun:test";
import { exportedSymbols } from "#integrations/vscode-support/script/symbols.ts";

describe("exportedSymbols", () => {
  test("reads a function with its JSDoc and multi-line parameters", () => {
    const source = `/**
 * Adds two numbers.
 */
export function add(
  a: number,
  b: number,
): number {
  return a + b;
}`;
    expect(exportedSymbols(source, "./math.ts")).toEqual([
      {
        name: "add",
        kind: "function",
        signature: "function add( a: number, b: number, ): number",
        doc: "Adds two numbers.",
        isDefault: false,
        specifier: "./math.ts",
      },
    ]);
  });

  test("reads async, generator and object-returning functions", () => {
    const source = `export async function load(): Promise<void> {}
export function* walk(): Iterable<string> {}
export function config(): { size: number } {
  return { size: 1 };
}`;
    expect(exportedSymbols(source, "./x.ts").map((symbol) => symbol.signature)).toEqual([
      "async function load(): Promise<void>",
      "function* walk(): Iterable<string>",
      "function config(): { size: number }",
    ]);
  });

  test("reads const, let and var with a type annotation", () => {
    const source = `export const count: number = 0;
export let label = "x";
export var lookup:
  Map<string, number> = new Map();`;
    expect(exportedSymbols(source, "./state.ts")).toEqual([
      {
        name: "count",
        kind: "const",
        signature: "const count: number",
        doc: "",
        isDefault: false,
        specifier: "./state.ts",
      },
      {
        name: "label",
        kind: "const",
        signature: "let label",
        doc: "",
        isDefault: false,
        specifier: "./state.ts",
      },
      {
        name: "lookup",
        kind: "const",
        signature: "var lookup: Map<string, number>",
        doc: "",
        isDefault: false,
        specifier: "./state.ts",
      },
    ]);
  });

  test("reads class, interface, type and enum heads", () => {
    const source = `export class Store extends Base implements Reader {
  read() {}
}
export interface Props extends Base {
  size: number;
}
export type Id = string;
export enum Color {
  Red,
}`;
    expect(exportedSymbols(source, "./model.ts")).toEqual([
      {
        name: "Store",
        kind: "class",
        signature: "class Store extends Base",
        doc: "",
        isDefault: false,
        specifier: "./model.ts",
      },
      {
        name: "Props",
        kind: "interface",
        signature: "interface Props extends Base",
        doc: "",
        isDefault: false,
        specifier: "./model.ts",
      },
      {
        name: "Id",
        kind: "type",
        signature: "type Id",
        doc: "",
        isDefault: false,
        specifier: "./model.ts",
      },
      {
        name: "Color",
        kind: "enum",
        signature: "enum Color",
        doc: "",
        isDefault: false,
        specifier: "./model.ts",
      },
    ]);
  });

  test("reads default function and class exports", () => {
    const source = `export default function make(): void {}
export default class Panel {
  open() {}
}`;
    expect(
      exportedSymbols(source, "./x.ts").map(({ name, signature, isDefault }) => ({
        name,
        signature,
        isDefault,
      })),
    ).toEqual([
      { name: "make", signature: "default function make(): void", isDefault: true },
      { name: "Panel", signature: "default class Panel", isDefault: true },
    ]);
  });

  test("names an anonymous default export", () => {
    expect(exportedSymbols("export default function () {}", "./x.ts")[0]).toEqual({
      name: "default",
      kind: "function",
      signature: "default function ()",
      isDefault: true,
      doc: "",
      specifier: "./x.ts",
    });
  });

  test("reads names from export braces", () => {
    const source = `const a = 1;
const b = 2;
export { a, b as c };`;
    expect(exportedSymbols(source, "./x.ts")).toEqual([
      {
        name: "a",
        kind: "const",
        signature: "const a",
        doc: "",
        isDefault: false,
        specifier: "./x.ts",
      },
      {
        name: "c",
        kind: "const",
        signature: "const c",
        doc: "",
        isDefault: false,
        specifier: "./x.ts",
      },
    ]);
  });

  test("skips re-exports and star exports", () => {
    const source = `export { a } from "./a.ts";
export * from "./b.ts";`;
    expect(exportedSymbols(source, "./x.ts")).toEqual([]);
  });

  test("caps a long signature at 160 characters", () => {
    const params = Array.from({ length: 20 }, (_, index) => `argument${index}: string`).join(", ");
    const [symbol] = exportedSymbols(`export function wide(${params}) {}`, "./x.ts");
    expect(symbol?.signature.length).toBe(161);
    expect(symbol?.signature.endsWith("…")).toBe(true);
  });

  test("renders an @example tag as a fenced ts block", () => {
    const source = `/**
 * Formats a name.
 *
 * @example
 * format("a")
 * // "A"
 */
export function format(name: string): string {
  return name.toUpperCase();
}`;
    expect(exportedSymbols(source, "./text.ts")[0]?.doc).toBe(
      'Formats a name.\n\n```ts\nformat("a")\n// "A"\n```',
    );
  });

  test("ignores declarations inside comments and strings", () => {
    const source = `const note = "export function fake() {}";
// export const fake2 = 1;
/* export class Fake {} */
export const real = 1;`;
    expect(exportedSymbols(source, "./x.ts").map((symbol) => symbol.name)).toEqual(["real"]);
  });

  test("ignores declarations nested in a function body", () => {
    const source = `export function outer() {
  const inner = 1;
}
export const visible = 2;`;
    expect(exportedSymbols(source, "./x.ts").map((symbol) => symbol.name)).toEqual([
      "outer",
      "visible",
    ]);
  });
});
