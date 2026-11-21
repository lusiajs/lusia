import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { CODES } from "#compiler/errors/codes.ts";
import { COMPILE_CODES } from "#compiler/errors/codes/compile.ts";
import { RUNTIME_CODES } from "#compiler/errors/codes/runtime.ts";
import { BUNDLE_CODES } from "#compiler/errors/codes/bundle.ts";

const SRC_DIR = join(import.meta.dir, "../../src");
const CODE_PATTERN = /["'`](?<code>L[123]\d{3})["'`]/g;

const GROUPS: Record<string, Record<string, unknown>> = {
  L1: COMPILE_CODES,
  L2: RUNTIME_CODES,
  L3: BUNDLE_CODES,
};

function recordCode(found: Map<string, string[]>, code: string, file: string): void {
  const files = found.get(code) ?? [];
  files.push(file);
  found.set(code, files);
}

async function referencedCodes(): Promise<Map<string, string[]>> {
  const found = new Map<string, string[]>();
  const glob = new Bun.Glob("**/*.ts");
  for await (const path of glob.scan({ cwd: SRC_DIR, absolute: true })) {
    if (path.includes("/errors/codes/")) continue;
    const text = await Bun.file(path).text();
    for (const match of text.matchAll(CODE_PATTERN)) {
      const code = match.groups?.code;
      if (code !== undefined) recordCode(found, code, path.slice(SRC_DIR.length + 1));
    }
  }
  return found;
}

describe("error codes: names and groups", () => {
  test("every code is L1xxx, L2xxx or L3xxx", () => {
    const bad = Object.keys(CODES).filter((code) => !/^L[123]\d{3}$/.test(code));
    expect(bad, `Codes must look like L1001: ${bad.join(", ")}`).toEqual([]);
  });

  test("each group only holds its own range", () => {
    for (const [prefix, group] of Object.entries(GROUPS)) {
      const wrong = Object.keys(group).filter((code) => !code.startsWith(prefix));
      expect(wrong, `Move these out of the ${prefix} group: ${wrong.join(", ")}`).toEqual([]);
    }
  });

  test("codes are unique across the three groups", () => {
    const groupCount = Object.values(GROUPS).reduce(
      (sum, group) => sum + Object.keys(group).length,
      0,
    );
    expect(groupCount, "A code appears in two groups").toBe(Object.keys(CODES).length);
  });
});

describe("error codes: messages and hints", () => {
  test("every code has a message", () => {
    const empty = Object.keys(CODES).filter(
      (code) => CODES[code as keyof typeof CODES].message.trim() === "",
    );
    expect(empty, `Empty message: ${empty.join(", ")}`).toEqual([]);
  });

  test("every code has a hint (a $tip placeholder is allowed)", () => {
    const empty = Object.keys(CODES).filter(
      (code) => CODES[code as keyof typeof CODES].hint.trim() === "",
    );
    expect(
      empty,
      `Empty hint: ${empty.join(", ")}. Add a hint in src/compiler/errors/codes/.`,
    ).toEqual([]);
  });
});

describe("error codes: source references", () => {
  test("every code used in src/ exists in CODES", async () => {
    const found = await referencedCodes();
    const unknown = [...found.keys()].filter((code) => !(code in CODES));
    const details = unknown.map((code) => `${code} (${found.get(code)?.join(", ")})`);
    expect(
      unknown,
      `Unknown codes: ${details.join("; ")}. Add them in src/compiler/errors/codes/.`,
    ).toEqual([]);
  });
});
