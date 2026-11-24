import { describe, expect, test } from "bun:test";
import { openCommand } from "#cli/dev/open-browser.ts";

const URL_TEXT = "http://localhost:3000/";

describe("openCommand", () => {
  test("uses open on macOS", () => {
    expect(openCommand("darwin", URL_TEXT)).toEqual(["open", URL_TEXT]);
  });

  test("uses cmd start on Windows, with the empty title start needs", () => {
    expect(openCommand("win32", URL_TEXT)).toEqual(["cmd", "/c", "start", "", URL_TEXT]);
  });

  test("uses xdg-open everywhere else", () => {
    expect(openCommand("linux", URL_TEXT)).toEqual(["xdg-open", URL_TEXT]);
  });
});
