import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { api, type ApiEntry } from "../../reference/api.ts";
import { compile } from "#compiler/index.ts";
import { componentSource, exampleShape, syntaxErrors } from "./examples-shape.ts";

const FILE = join(import.meta.dir, "Example.lusia");

// Examples that cannot be checked by compile or syntax. Keyed by entry id, with a reason.
const UNCHECKED_EXAMPLES: Record<string, string> = {};

// Examples that do not compile today. Keyed by entry id, with the real error text. Owner to fix.
const KNOWN_BROKEN_EXAMPLES: Record<string, string> = {};

function compileError(source: string): string | undefined {
  try {
    compile(source, FILE);
    return undefined;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

function checkExample(entry: ApiEntry): string | undefined {
  const shape = exampleShape(entry.example);
  if (shape === "typescript") {
    const errors = syntaxErrors(entry.example);
    return errors.length > 0 ? errors.join("\n") : undefined;
  }
  return compileError(componentSource(entry.example, shape));
}

function verify(entry: ApiEntry): void {
  const error = checkExample(entry);
  const known = KNOWN_BROKEN_EXAMPLES[entry.id];
  if (known !== undefined) {
    expect(error, `${entry.id} now passes. Remove it from KNOWN_BROKEN_EXAMPLES.`).toBe(known);
    return;
  }
  expect(
    error,
    `${entry.id} does not compile. Fix the example in reference/api/*.ts.`,
  ).toBeUndefined();
}

describe("reference examples: each example compiles or parses", () => {
  for (const entry of api) {
    const reason = UNCHECKED_EXAMPLES[entry.id];
    if (reason !== undefined) {
      test.skip(`${entry.id} (unchecked: ${reason})`, () => {});
      continue;
    }
    test(entry.id, () => verify(entry));
  }
});

describe("reference examples: allowlists", () => {
  test("UNCHECKED_EXAMPLES and KNOWN_BROKEN_EXAMPLES only name real entries", () => {
    const ids = new Set(api.map((entry) => entry.id));
    const stale = [
      ...Object.keys(UNCHECKED_EXAMPLES),
      ...Object.keys(KNOWN_BROKEN_EXAMPLES),
    ].filter((id) => !ids.has(id));
    expect(stale, `Entries not found in reference/api: ${stale.join(", ")}`).toEqual([]);
  });
});
