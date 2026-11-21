import { describe, expect, test } from "bun:test";
import { lusia } from "#bun-plugin/index.ts";
import badge from "./fixtures/Badge.lusia?raw";
import note from "./fixtures/note.txt?raw";

const ENTRY = new URL("./fixtures/raw-entry.ts", import.meta.url).pathname;

describe("?raw imports", () => {
  test("default-exports the file text as a string", () => {
    expect(note).toBe("Raw note text\n");
  });

  test("keeps .lusia source as text instead of compiling it", () => {
    expect(badge).toContain('<span class="badge">Badge source</span>');
  });

  test("resolves the same way in Bun.build", async () => {
    const result = await Bun.build({ entrypoints: [ENTRY], plugins: [lusia()], target: "bun" });
    expect(result.success).toBe(true);
    expect(await result.outputs[0]!.text()).toContain("Raw note text");
  });
});
