import { describe, expect, test } from "bun:test";
import { api, type ApiEntry } from "#reference/api.ts";
import * as runtime from "#runtime/index.ts";
import { RESERVED_TAGS } from "#compiler/parse/reserved.ts";
import {
  HOVER_KEYS,
  ITEM_KEYS,
  SCROLL_KEYS,
  SPACE_KEYS,
  VIEW_KEYS,
} from "#runtime/animate/options/keys.ts";

const FIX = "Add an entry in reference/api/*.ts, or add the name to UNDOCUMENTED with a reason.";

// Public exports with no API entry yet. Each needs a reason.
const UNDOCUMENTED: Record<string, string> = {
  LusiaError: "error class thrown at runtime; no API entry yet",
  lazy: "helper the compiler emits for lazy components; no API entry yet",
};

// Tags the compiler reads that are not in RESERVED_TAGS. Private in src/compiler/parse/markers.ts.
const MARKER_TAGS = ["FALLBACK", "NO_LAZY", "NO_SSR"];

const ANIMATE_KEYS = [...ITEM_KEYS, ...VIEW_KEYS, ...HOVER_KEYS, ...SCROLL_KEYS, ...SPACE_KEYS];

function isDocumented(name: string): boolean {
  return api.some(
    (entry) =>
      entry.name === name || entry.name.startsWith(`${name}(`) || entry.name.startsWith(`${name}.`),
  );
}

function hasMarkupEntry(tag: string): boolean {
  const opening = new RegExp(`^<${tag}[\\s>/]`);
  return api.some((entry) => entry.kind === "markup" && opening.test(entry.name));
}

function entryText(entry: ApiEntry): string {
  const memberNames = (entry.members ?? []).map((member) => member.name);
  return [
    entry.name,
    entry.signature,
    entry.summary,
    ...entry.bullets,
    entry.example,
    ...memberNames,
  ].join("\n");
}

function wordIn(word: string, text: string): boolean {
  return new RegExp(`\\b${word}\\b`).test(text);
}

describe("reference coverage: public exports", () => {
  const exportNames = Object.keys(runtime);

  test("every public export has an API entry", () => {
    const missing = exportNames.filter((name) => !isDocumented(name) && !(name in UNDOCUMENTED));
    expect(missing, `Undocumented exports: ${missing.join(", ")}. ${FIX}`).toEqual([]);
  });

  test("UNDOCUMENTED lists only real exports that still have no entry", () => {
    const stale = Object.keys(UNDOCUMENTED).filter(
      (name) => !exportNames.includes(name) || isDocumented(name),
    );
    expect(stale, `Remove from UNDOCUMENTED: ${stale.join(", ")}`).toEqual([]);
  });
});

describe("reference coverage: markup tags", () => {
  test("every built-in tag the compiler recognizes has a markup entry", () => {
    const tags = [...RESERVED_TAGS, ...MARKER_TAGS];
    const missing = tags.filter((tag) => !hasMarkupEntry(tag));
    expect(missing, `Tags with no markup entry: ${missing.join(", ")}. ${FIX}`).toEqual([]);
  });
});

describe("reference coverage: animate keys", () => {
  test("every animate option key is mentioned in some API entry", () => {
    const text = api.map(entryText).join("\n");
    const missing = ANIMATE_KEYS.filter((key) => !wordIn(key, text));
    expect(missing, `Animate keys not in any entry: ${missing.join(", ")}. ${FIX}`).toEqual([]);
  });
});
