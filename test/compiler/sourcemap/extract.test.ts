import { describe, expect, test } from "bun:test";
import { extractSourceMap } from "#compiler/sourcemap/extract.ts";

const DIGITS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** Decodes one VLQ number from `text` at `pos`. Returns the value and the next position. */
function readVlq(text: string, pos: number): [number, number] {
  let value = 0;
  let shift = 0;
  let digit: number;
  do {
    digit = DIGITS.indexOf(text[pos++]!);
    value += (digit & 31) << shift;
    shift += 5;
  } while (digit & 32);
  const negative = (value & 1) === 1;
  const magnitude = value >> 1;
  return [negative ? -magnitude : magnitude, pos];
}

/** Decodes all the VLQ numbers packed in one segment field. */
function decodeFields(field: string): number[] {
  const values: number[] = [];
  let pos = 0;
  while (pos < field.length) {
    const [value, next] = readVlq(field, pos);
    values.push(value);
    pos = next;
  }
  return values;
}

type Segment = [
  generatedColumn: number,
  sourceIndex: number,
  sourceLine: number,
  sourceColumn: number,
];

/** Decodes `mappings` into absolute segments, one array per generated line. */
function decodeMappings(mappings: string): Segment[][] {
  let sourceIndex = 0;
  let sourceLine = 0;
  let sourceColumn = 0;
  return mappings.split(";").map((line) => {
    let generatedColumn = 0;
    const segments: Segment[] = [];
    for (const field of line.split(",").filter(Boolean)) {
      const values = decodeFields(field);
      generatedColumn += values[0]!;
      sourceIndex += values[1]!;
      sourceLine += values[2]!;
      sourceColumn += values[3]!;
      segments.push([generatedColumn, sourceIndex, sourceLine, sourceColumn]);
    }
    return segments;
  });
}

describe("extractSourceMap", () => {
  test("removes the marker and maps the code after it to its .lusia position", () => {
    const { code, map } = extractSourceMap("/*@3:5*/x", "Card.lusia", "source text");
    expect(code).toBe("x");
    const parsed = JSON.parse(map);
    expect(parsed.version).toBe(3);
    expect(parsed.sources).toEqual(["Card.lusia"]);
    expect(decodeMappings(parsed.mappings)).toEqual([[[0, 0, 2, 4]]]);
  });

  test("maps each marker on its own line, with columns counted from the line start", () => {
    const { code, map } = extractSourceMap("a = /*@7:1*/b;\n  /*@8:3*/c", "Card.lusia", "");
    expect(code).toBe("a = b;\n  c");
    expect(decodeMappings(JSON.parse(map).mappings)).toEqual([[[4, 0, 6, 0]], [[2, 0, 7, 2]]]);
  });

  test("code without markers has no segments", () => {
    const { code, map } = extractSourceMap("const a = 1;", "Card.lusia", "");
    expect(code).toBe("const a = 1;");
    expect(JSON.parse(map).mappings).toBe("");
  });
});
