import { describe, expect, test } from "bun:test";
import { compileParts } from "#compiler/pipeline.ts";

const SOURCE = `<p class="note">hi</p>\n\n<style scoped>\n  .note {\n    color: red;\n  }\n</style>\n`;

describe("compileParts style step", () => {
  test("a style step without the cached field still works and counts as not cached", () => {
    const result = compileParts(SOURCE, "Note.lusia", {
      dev: false,
      displayFile: "Note.lusia",
      styles: () => ({ css: "", deps: [], ms: 0 }),
    });
    expect(result.styleBlocks).toEqual([{ index: 0, cached: false, ms: 0 }]);
  });
});
