import { describe, expect, test } from "bun:test";
import { LusiaError } from "#compiler/errors/error.ts";
import { formatError } from "#cli/format/format-error.ts";
import { loadPrettier } from "#cli/format/format-parts.ts";

function missingPrettier(): Error {
  return Object.assign(new Error("Cannot find package 'prettier'"), {
    code: "ERR_MODULE_NOT_FOUND",
  });
}

describe("loadPrettier", () => {
  test("loads prettier when it is installed", async () => {
    const prettier = await loadPrettier();
    expect(typeof prettier.format).toBe("function");
  });

  test("stops with a clear error when prettier is missing", async () => {
    const error = await loadPrettier(async () => {
      throw missingPrettier();
    }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(LusiaError);
    expect(formatError(error as LusiaError, undefined, false)).toBe(
      "error L3005: lusia format needs prettier.\n\nhint: Run: bun add -d prettier",
    );
  });

  test("passes other load errors through unchanged", async () => {
    const broken = new Error("prettier failed to start");
    const error = await loadPrettier(async () => {
      throw broken;
    }).catch((caught: unknown) => caught);
    expect(error).toBe(broken);
  });
});
