import { describe, expect, test } from "bun:test";
import schema from "../../config.schema.json";
import { EASE } from "#runtime/animate/modes/modes.ts";
import { PRESET } from "#runtime/animate/options/presets.ts";

const defs = schema.$defs;

describe("config.schema.json animate section", () => {
  test("preset names match the PRESET export, in order", () => {
    expect(defs.preset.enum).toEqual(Object.keys(PRESET));
  });

  test("easing style names match EASE.STYLE", () => {
    expect(defs.easeStyle.enum).toEqual(Object.keys(EASE.STYLE));
  });

  test("direction names match EASE IN, OUT and INOUT", () => {
    expect(defs.ease.enum).toEqual(["IN", "OUT", "INOUT"]);
  });

  test("the in and out keys take a preset name or a keyframes object", () => {
    const animate = schema.properties.animate.properties;
    const accepted = [{ $ref: "#/$defs/preset" }, { type: "object" }];
    expect(animate.in.anyOf).toEqual(accepted);
    expect(animate.out.anyOf).toEqual(accepted);
  });
});
