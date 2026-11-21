import { describe, expect, test } from "bun:test";
import { LusiaError } from "#compiler/errors/error.ts";
import { formatError } from "#cli/format/format-error.ts";

const SOURCE = ["<script>", "const a = 1;", "</script>", "<p>{a + }</p>", "<p>ok</p>"].join("\n");
const FILE = `${process.cwd()}/src/Card.lusia`;

function sample(): LusiaError {
  return new LusiaError("empty {}", FILE, 4, 3, {
    code: "L1011",
    hint: "Put an expression between the braces, such as {count}.",
    length: 2,
  });
}

describe("formatError", () => {
  test("prints a tsc-style location, code frame and hint without color", () => {
    expect(formatError(sample(), SOURCE, false)).toBe(
      [
        "src/Card.lusia:4:3 - error L1011: empty {}",
        "",
        "2 | const a = 1;",
        "3 | </script>",
        "4 | <p>{a + }</p>",
        "  |   ^~",
        "5 | <p>ok</p>",
        "",
        "hint: Put an expression between the braces, such as {count}.",
      ].join("\n"),
    );
  });

  test("adds ANSI colors when color is on", () => {
    const colored = formatError(sample(), SOURCE, true);
    expect(colored).toContain("\x1b[31m");
    expect(colored).toContain("\x1b[33m4:3");
    expect(colored.replace(/\x1b\[[0-9;]*m/g, "")).toBe(formatError(sample(), SOURCE, false));
  });

  test("drops the dev runtime suffix from the message, since the location is already printed", () => {
    const error = new LusiaError(
      "FOR needs a step that is not 0 (src/Card.lusia:24:8)",
      "src/Card.lusia",
      24,
      8,
      {
        code: "L2042",
        hint: "Use a step such as 1, or -1 to count down.",
      },
    );
    expect(formatError(error, undefined, false)).toBe(
      "src/Card.lusia:24:8 - error L2042: FOR needs a step that is not 0\n\nhint: Use a step such as 1, or -1 to count down.",
    );
  });

  test("keeps a message whose parenthesis is not the location", () => {
    const error = new LusiaError("step (see docs)", "src/Card.lusia", 2, 1, { code: "L2042" });
    expect(formatError(error, undefined, false)).toBe(
      "src/Card.lusia:2:1 - error L2042: step (see docs)",
    );
  });

  test("a runtime error with no location prints the code and hint only", () => {
    const error = new LusiaError(
      "animate duration must be a time in ms, got -1",
      undefined,
      undefined,
      undefined,
      {
        code: "L2003",
        hint: "Use a number of milliseconds, such as 300.",
      },
    );
    expect(formatError(error, undefined, false)).toBe(
      "error L2003: animate duration must be a time in ms, got -1\n\nhint: Use a number of milliseconds, such as 300.",
    );
  });
});
