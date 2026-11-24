import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readIndentSetting } from "#language/format/indent-setting.ts";

const folders: string[] = [];
afterAll(() => folders.forEach((folder) => rmSync(folder, { recursive: true })));

function folderWith(file: string, text: string): string {
  const folder = mkdtempSync(join(tmpdir(), "lusia-indent-"));
  folders.push(folder);
  if (file !== "") writeFileSync(join(folder, file), text);
  return folder;
}

describe("readIndentSetting", () => {
  test("defaults to indenting", () => {
    expect(readIndentSetting(folderWith("", ""))).toBe(true);
    expect(readIndentSetting(folderWith("lusia.config.json", "{}"))).toBe(true);
    expect(readIndentSetting(folderWith("lusia.config.json", "not json"))).toBe(true);
  });

  test("reads false from the JSON config", () => {
    const text = JSON.stringify({ format: { indentScriptAndStyle: false } });
    expect(readIndentSetting(folderWith("lusia.config.json", text))).toBe(false);
  });

  test("reads the setting from the TypeScript config", () => {
    const off = "export default { format: { indentScriptAndStyle: false } };";
    const on = "export default { format: { indentScriptAndStyle: true } };";
    expect(readIndentSetting(folderWith("lusia.config.ts", off))).toBe(false);
    expect(readIndentSetting(folderWith("lusia.config.ts", on))).toBe(true);
  });
});
