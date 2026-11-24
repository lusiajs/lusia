import { describe, expect, test } from "bun:test";
import type { Row } from "#cli/report/report-model.ts";
import { sortRows } from "#cli/report/report-sort.ts";

const rows: Row[] = [
  { name: "b.lusia", ms: 2, bytes: 100 },
  { name: "a.lusia", ms: 2, bytes: 300 },
  { name: "c.lusia", ms: 9, bytes: 50 },
];

describe("sortRows", () => {
  test("time sorts largest first, then by name", () => {
    expect(sortRows(rows, "time").map((row) => row.name)).toEqual([
      "c.lusia",
      "a.lusia",
      "b.lusia",
    ]);
  });

  test("size sorts largest first", () => {
    expect(sortRows(rows, "size").map((row) => row.name)).toEqual([
      "a.lusia",
      "b.lusia",
      "c.lusia",
    ]);
  });

  test("name sorts A to Z", () => {
    expect(sortRows(rows, "name").map((row) => row.name)).toEqual([
      "a.lusia",
      "b.lusia",
      "c.lusia",
    ]);
  });

  test("sorts the children of each row too", () => {
    const packages: Row[] = [
      {
        name: "lib",
        children: [
          { name: "small.js", bytes: 1 },
          { name: "big.js", bytes: 9 },
        ],
      },
    ];
    const [sorted] = sortRows(packages, "size");
    expect(sorted?.children?.map((child) => child.name)).toEqual(["big.js", "small.js"]);
  });

  test("does not change the input order", () => {
    sortRows(rows, "size");
    expect(rows[0]?.name).toBe("b.lusia");
  });
});
