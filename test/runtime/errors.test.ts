import { describe, expect, test } from "bun:test";
import { withWhere, runtimeError } from "#runtime/errors.ts";

describe("runtime errors", () => {
  test("carry no location outside a dev location", () => {
    const error = runtimeError("L2042");
    expect(error.code).toBe("L2042");
    expect(error.hint).toBe("Use a step such as 1, or -1 to count down.");
    expect(error.message).toBe("FOR needs a step that is not 0");
    expect(error.file).toBeUndefined();
    expect(error.line).toBeUndefined();
  });

  test("take file, line and column from the location in scope, and end the message with it", () => {
    const error = withWhere("src/Card.lusia:24:8", () => runtimeError("L2042"));
    expect(error).toMatchObject({ file: "src/Card.lusia", line: 24, column: 8, code: "L2042" });
    expect(error.message).toBe("FOR needs a step that is not 0 (src/Card.lusia:24:8)");
  });

  test("the location ends with the scope and keeps colons in the file name", () => {
    expect(runtimeError("L2042").file).toBeUndefined();
    expect(withWhere("C:/app/Card.lusia:1:2", () => runtimeError("L2042")).file).toBe(
      "C:/app/Card.lusia",
    );
  });
});
