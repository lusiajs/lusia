import { expect, test } from "bun:test";
import type { LusiaImport } from "#compiler/parse/imports.ts";
import { namesToSplit } from "#compiler/lazy/plan.ts";
import type { ChildInfo, LazyOptions } from "#compiler/lazy/options.ts";

function options(children: Record<string, ChildInfo>): LazyOptions {
  return {
    mode: "smart",
    prefetch: "idle",
    childOf: (specifier) => children[specifier] ?? { nolazy: false, fallback: false },
  };
}

const markup = `<IF {open}><Folder /><Card /></IF>`;
const imports = [
  { name: "Folder", specifier: "./Folder.lusia" },
  { name: "Card", specifier: "./Card.lusia" },
] as LusiaImport[];

test("a component that imports itself is never split", () => {
  const lazy = options({ "./Folder.lusia": { nolazy: false, fallback: false, self: true } });
  expect([...namesToSplit(lazy, imports, markup, "")]).toEqual(["Card"]);
});
