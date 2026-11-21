import { describe, expect, test } from "bun:test";
import { encodeVlq } from "#compiler/sourcemap/vlq.ts";

describe("encodeVlq", () => {
  test("encodes zero, positive and negative values", () => {
    expect(encodeVlq(0)).toBe("A");
    expect(encodeVlq(1)).toBe("C");
    expect(encodeVlq(-1)).toBe("D");
  });

  test("uses a continuation digit past 15", () => {
    expect(encodeVlq(16)).toBe("gB");
  });
});
