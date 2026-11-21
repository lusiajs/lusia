import { describe, expect, test } from "bun:test";
import { hash } from "#compiler/id.ts";

describe("hash", () => {
  test("is stable and differs by input", () => {
    expect(hash("Card.lusia")).toBe(hash("Card.lusia"));
    expect(hash("Card.lusia")).not.toBe(hash("Other.lusia"));
  });

  test("matches FNV-1a offset basis for empty input", () => {
    expect(hash("")).toBe((0x811c9dc5).toString(36));
  });
});
