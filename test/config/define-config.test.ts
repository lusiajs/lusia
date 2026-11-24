import { describe, expect, test } from "bun:test";
import { defineConfig } from "#config/index.ts";

describe("defineConfig", () => {
  test("returns the same object", () => {
    const config = { outdir: "out", animate: { duration: 500 } };
    expect(defineConfig(config)).toBe(config);
  });

  test("type errors for unknown keys and bad presets", () => {
    const unknownKey = defineConfig({
      // @ts-expect-error unknown top-level key
      notAKey: true,
    });
    const badPreset = defineConfig({
      animate: {
        // @ts-expect-error not a preset name
        in: "NOT_A_PRESET",
      },
    });
    expect(unknownKey).toBeDefined();
    expect(badPreset).toBeDefined();
  });
});
