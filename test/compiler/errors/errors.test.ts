import { describe, expect, test } from "bun:test";
import { LusiaError } from "#compiler/errors/error.ts";
import { CODES } from "#compiler/errors/codes.ts";
import { fill, lusiaError } from "#compiler/errors/create.ts";
import { formatWhere, parseWhere } from "#compiler/errors/where.ts";

describe("error codes", () => {
  test("every code has a message and a hint", () => {
    for (const [code, entry] of Object.entries(CODES)) {
      expect(entry.message.length, `${code} message`).toBeGreaterThan(0);
      expect(entry.hint.length, `${code} hint`).toBeGreaterThan(0);
    }
  });
});

describe("fill", () => {
  test("replaces each $name with its value", () => {
    expect(fill("$attr needs {variable}", { attr: "bind-value" })).toBe(
      "bind-value needs {variable}",
    );
  });

  test("leaves a $name without a value as it is", () => {
    expect(fill("$a and $b", { a: "x" })).toBe("x and $b");
  });
});

describe("lusiaError", () => {
  test("returns a LusiaError with the code, filled message and hint, and the span", () => {
    const error = lusiaError(
      "L1004",
      { name: "IF" },
      { file: "Card.lusia", line: 2, column: 1, length: 3 },
    );
    expect(error).toBeInstanceOf(LusiaError);
    expect(error.code).toBe("L1004");
    expect(error.message).toBe("IF is a reserved tag name and cannot be a component");
    expect(error.hint).toBe(
      "Rename the component. IF, ELSEIF, ELSE, EACH, FOR, CONTENT and HTML are built in.",
    );
    expect(error.file).toBe("Card.lusia");
    expect(error.line).toBe(2);
    expect(error.column).toBe(1);
    expect(error.length).toBe(3);
  });
});

describe("where strings", () => {
  test("parseWhere reads back what formatWhere wrote", () => {
    const where = formatWhere("src/app/Card.lusia", 3, 5);
    expect(where).toBe("src/app/Card.lusia:3:5");
    expect(parseWhere(where)).toEqual({ file: "src/app/Card.lusia", line: 3, column: 5 });
  });

  test("a file name with colons survives the round trip", () => {
    const where = formatWhere("C:/work/a:b/Card.lusia", 12, 40);
    expect(parseWhere(where)).toEqual({ file: "C:/work/a:b/Card.lusia", line: 12, column: 40 });
  });

  test("a string without a position is not a where", () => {
    expect(parseWhere("Card.lusia")).toBeUndefined();
  });
});
