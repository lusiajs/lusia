import { describe, expect, test } from "bun:test";
import { isIgnoredBrowserError } from "#cli/dev/ignored-browser-errors.ts";

describe("isIgnoredBrowserError", () => {
  test("ignores both ResizeObserver loop wordings", () => {
    expect(
      isIgnoredBrowserError("ResizeObserver loop completed with undelivered notifications."),
    ).toBe(true);
    expect(isIgnoredBrowserError("ResizeObserver loop limit exceeded")).toBe(true);
  });

  test("keeps real errors", () => {
    expect(isIgnoredBrowserError("TypeError: x is undefined")).toBe(false);
    expect(isIgnoredBrowserError("Uncaught ResizeObserver loop")).toBe(false);
  });
});
