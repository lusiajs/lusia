import { describe, expect, test } from "bun:test";
import { isValidVersion, releaseTag } from "../../scripts/release-version.ts";

describe("isValidVersion", () => {
  test.each(["0.1.5", "10.20.30", "0.1.5-beta", "0.1.5-beta-2", "0.1.0-beta.1", "1.0.0-rc.1"])(
    "accepts %s",
    (version) => {
      expect(isValidVersion(version)).toBe(true);
    },
  );

  test.each([
    "",
    "0.1",
    "0.1.5.1",
    "v0.1.5",
    "0.1.x",
    "0.1.5-",
    "0.1.5-beta..1",
    "0.1.5 beta",
    "0.1.5+build",
  ])("rejects %j", (version) => {
    expect(isValidVersion(version)).toBe(false);
  });
});

describe("releaseTag", () => {
  test("prefixes the version with v", () => {
    expect(releaseTag("0.1.5-beta")).toBe("v0.1.5-beta");
  });
});
