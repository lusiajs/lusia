import { describe, expect, test } from "bun:test";
import {
  formatBrowserError,
  formatBuildError,
  formatUpdate,
  groupFiles,
} from "#cli/log/dev-block.ts";
import { stripAnsi } from "#cli/log/color.ts";

const TIME = new Date(2026, 0, 1, 15, 9, 46);
const DOCS = Array.from({ length: 72 }, (_, index) => `public/docs/page-${index}.md`);

describe("groupFiles", () => {
  test("one file is listed as it is", () => {
    expect(groupFiles(["src/Hero.lusia"])).toEqual(["src/Hero.lusia"]);
  });

  test("three files are listed one by one", () => {
    const files = ["a/x.lusia", "b/y.lusia", "c/z.lusia"];
    expect(groupFiles(files)).toEqual(files);
  });

  test("a folder with many files becomes one entry with the count", () => {
    expect(groupFiles(DOCS)).toEqual(["public/docs/  72 files"]);
  });

  test("a folder with two files is listed one by one", () => {
    const files = [...DOCS, "public/llms.txt", "public/llms-full.txt"];
    expect(groupFiles(files)).toEqual([
      "public/docs/  72 files",
      "public/llms.txt",
      "public/llms-full.txt",
    ]);
  });
});

describe("formatUpdate", () => {
  test("a hot update with its timing, without color", () => {
    const block = formatUpdate(
      {
        time: TIME,
        kind: "hot",
        files: ["src/components/Hero.lusia"],
        steps: { sass: 0, compile: 14, bundle: 205, total: 294 },
        browserMs: 75,
      },
      { color: false, showTiming: true },
    );
    expect(block).toBe(
      "15:09:46  ● hot     src/components/Hero.lusia\n" +
        "          ` total 294 ms | compile 14 | bundle 205 | browser 75",
    );
  });

  test("a reload of a folder, with the other files on a line and no timing", () => {
    const block = formatUpdate(
      {
        time: TIME,
        kind: "reload",
        files: [...DOCS, "public/llms.txt", "public/llms-full.txt"],
        steps: { total: 444 },
      },
      { color: false, showTiming: false },
    );
    expect(block).toBe(
      "15:09:46  ↻ reload  public/docs/  72 files\n" +
        "          ` + public/llms.txt, public/llms-full.txt",
    );
  });

  test("hides zero parts and shows the wait only above 5 ms", () => {
    const block = formatUpdate(
      {
        time: TIME,
        kind: "css",
        files: ["src/a.scss"],
        steps: { wait: 12, sass: 3, compile: 0, bundle: 0, total: 20 },
      },
      { color: false, showTiming: true },
    );
    expect(block.split("\n")[1]).toBe("          ` total 20 ms | wait 12 | styles 3");
  });

  test("colors the labels and the slowest part, and keeps the same text", () => {
    const block = formatUpdate(
      { time: TIME, kind: "hot", files: ["a.lusia"], steps: { compile: 1, bundle: 9, total: 10 } },
      { color: true, showTiming: true },
    );
    expect(block).toContain("\x1b[");
    expect(stripAnsi(block)).toBe(
      "15:09:46  ● hot     a.lusia\n          └ total 10 ms │ compile 1 │ bundle 9",
    );
  });
});

describe("formatBrowserError", () => {
  test("shows the message and the first stack frame", () => {
    const text = formatBrowserError(
      {
        time: TIME,
        page: "/guide",
        message: "TypeError: Cannot read properties of undefined (reading 'id')",
        stack:
          "TypeError: Cannot read properties of undefined (reading 'id')\n" +
          "    at render (src/components/Docs.lusia:101:12)\n" +
          "    at mount (src/components/Docs.lusia:40:3)",
      },
      false,
    );
    expect(text).toBe(
      "15:09:46  ✖ error   in browser  /guide\n" +
        "          | TypeError: Cannot read properties of undefined (reading 'id')\n" +
        "          ` at render (src/components/Docs.lusia:101:12)",
    );
  });
});

describe("formatBuildError", () => {
  test("shows each message line under the build error", () => {
    const text = formatBuildError(TIME, ["bad.lusia:3:1 Unexpected }\n  3 | }"], false);
    expect(text).toBe(
      "15:09:46  ✖ error   build\n" +
        "          | bad.lusia:3:1 Unexpected }\n" +
        "          `   3 | }",
    );
  });
});
