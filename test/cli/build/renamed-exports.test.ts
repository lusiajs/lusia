import { describe, expect, test } from "bun:test";
import { RENAMED_EXPORTS } from "#cli/build/renamed-exports.ts";

describe("renamed exports", () => {
  test("WHEN was renamed to ON, with the fix", () => {
    expect(RENAMED_EXPORTS.get("WHEN")).toBe(
      "WHEN was renamed to ON. Write ON.VIEW instead of WHEN.VIEW.",
    );
  });

  test("TURN was removed, and its fix names the switch modes of MIDWAY", () => {
    expect(RENAMED_EXPORTS.get("TURN")).toContain("MIDWAY.SWITCH");
    expect(RENAMED_EXPORTS.get("TURN")).toContain("midway: { mode: ... }");
  });
});
