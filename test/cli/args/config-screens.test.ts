import { describe, expect, test } from "bun:test";
import { parseConfig } from "#cli/args/config.ts";

function screensError(json: string): string {
  try {
    parseConfig(json);
    return "";
  } catch (error) {
    return (error as Error).message;
  }
}

describe("screens in lusia.config", () => {
  test("reads the sizes", () => {
    expect(parseConfig('{ "screens": { "SMALL": 0, "WIDE": 1400 } }').screens).toEqual({
      SMALL: 0,
      WIDE: 1400,
    });
  });

  test("leaves screens out when the config has none", () => {
    expect(parseConfig("{}").screens).toBeUndefined();
  });

  test("the smallest screen must start at 0", () => {
    expect(screensError('{ "screens": { "WIDE": 600 } }')).toContain("must start at 0");
  });

  test("names must be UPPER_SNAKE_CASE", () => {
    expect(screensError('{ "screens": { "phone": 0 } }')).toContain(
      'screen "phone" must be UPPER_SNAKE_CASE',
    );
  });

  test("REDUCED_MOTION is not a screen name", () => {
    expect(screensError('{ "screens": { "REDUCED_MOTION": 0 } }')).toContain(
      '"REDUCED_MOTION" is the motion setting',
    );
  });

  test("values must be whole numbers of 0 or more", () => {
    expect(screensError('{ "screens": { "PHONE": 0, "TABLET": 600.5 } }')).toContain(
      '"screens.TABLET" must be a whole number, 0 or more',
    );
    expect(screensError('{ "screens": { "PHONE": 0, "TABLET": -1 } }')).toContain(
      '"screens.TABLET" must be a whole number',
    );
  });

  test("two screens cannot start at the same width", () => {
    expect(screensError('{ "screens": { "PHONE": 0, "A": 600, "B": 600 } }')).toContain(
      '"screens.A" and "screens.B" both start at 600',
    );
  });

  test("an empty object is an error", () => {
    expect(screensError('{ "screens": {} }')).toContain("needs at least one screen");
  });

  test("an unknown key in the config is still an error", () => {
    expect(screensError('{ "screen": {} }')).toContain('unknown key "screen"');
  });
});
