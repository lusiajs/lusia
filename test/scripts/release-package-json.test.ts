import { describe, expect, test } from "bun:test";
import { setPackageVersionText } from "../../scripts/release-package-json.ts";

const PACKAGE_TEXT = `{
  "name": "lusiajs",
  "version": "0.1.4-beta",
  "keywords": [
    "ui"
  ]
}
`;

describe("setPackageVersionText", () => {
  test("replaces only the version value", () => {
    const updated = setPackageVersionText(PACKAGE_TEXT, "0.1.5-beta");
    expect(updated).toBe(PACKAGE_TEXT.replace('"0.1.4-beta"', '"0.1.5-beta"'));
  });

  test("keeps the trailing newline", () => {
    expect(setPackageVersionText(PACKAGE_TEXT, "0.1.5").endsWith("}\n")).toBe(true);
  });

  test("writes JSON that parses with the new version", () => {
    const parsed = JSON.parse(setPackageVersionText(PACKAGE_TEXT, "0.2.0"));
    expect(parsed.version).toBe("0.2.0");
    expect(parsed.name).toBe("lusiajs");
  });

  test("ignores a nested version field", () => {
    const text = `{\n  "name": "x",\n  "engines": {\n    "version": "1"\n  }\n}\n`;
    expect(() => setPackageVersionText(text, "0.1.5")).toThrow('no top-level "version"');
  });

  test("throws when there is no version field", () => {
    expect(() => setPackageVersionText('{\n  "name": "x"\n}\n', "0.1.5")).toThrow();
  });
});
