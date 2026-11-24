import { describe, expect, test } from "bun:test";
import { join, resolve } from "node:path";
import { isPackagePath, isPackageSpecifier, resolvedPackages } from "#cli/build/package-imports.ts";

describe("isPackageSpecifier", () => {
  test("package names and subpaths are packages", () => {
    expect(isPackageSpecifier("sass")).toBe(true);
    expect(isPackageSpecifier("@codemirror/view")).toBe(true);
    expect(isPackageSpecifier("@codemirror/lang-css")).toBe(true);
    expect(isPackageSpecifier("prismjs/components/prism-json.js")).toBe(true);
  });

  test("relative, absolute and # alias imports are not packages", () => {
    expect(isPackageSpecifier("./Greeting.lusia")).toBe(false);
    expect(isPackageSpecifier("../shared/x.ts")).toBe(false);
    expect(isPackageSpecifier("/abs/x.js")).toBe(false);
    expect(isPackageSpecifier("#app/button")).toBe(false);
  });

  test("URLs from CSS imports are not packages", () => {
    expect(isPackageSpecifier("https://fonts.googleapis.com/css2?family=Roboto")).toBe(false);
    expect(isPackageSpecifier("data:text/css,a{}")).toBe(false);
  });

  test("built-ins and lusia itself are not packages", () => {
    expect(isPackageSpecifier("node:fs")).toBe(false);
    expect(isPackageSpecifier("bun")).toBe(false);
    expect(isPackageSpecifier("bun:test")).toBe(false);
    expect(isPackageSpecifier("lusiajs")).toBe(false);
    expect(isPackageSpecifier("lusiajs/internal")).toBe(false);
    expect(isPackageSpecifier("lusia-runtime")).toBe(false);
  });

  test("a name that only starts with lusia is a package", () => {
    expect(isPackageSpecifier("lusiajs-extra")).toBe(true);
  });
});

describe("resolvedPackages", () => {
  const root = resolve("/home/me/app");
  const app = join(root, "src", "main.ts");
  const sassFile = join(root, "node_modules", "sass", "sass.default.js");
  const inputs = {
    [app]: {
      imports: [
        { path: sassFile, original: "sass" },
        { path: join(root, "src", "alias.ts"), original: "#app/alias" },
      ],
    },
    [sassFile]: { imports: [] },
  };

  test("gives the file the app build resolved, for each collected package", () => {
    const found = new Map([["sass", app]]);
    expect(resolvedPackages(found, inputs, root)).toEqual(
      new Map([["sass", join(root, "node_modules", "sass", "sass.default.js")]]),
    );
  });

  test("drops a specifier that resolves to an app file", () => {
    const found = new Map([["#app/alias", app]]);
    expect(resolvedPackages(found, inputs, root).size).toBe(0);
  });

  test("ignores an import made from another file", () => {
    const found = new Map([["sass", join(root, "src", "other.ts")]]);
    expect(resolvedPackages(found, inputs, root).size).toBe(0);
  });
});

describe("isPackagePath", () => {
  const root = "/home/me/app";

  test("a file in node_modules is a package", () => {
    expect(isPackagePath("/home/me/app/node_modules/sass/sass.js", root)).toBe(true);
  });

  test("a linked package outside the app folder is a package", () => {
    expect(isPackagePath("/home/me/lusia/src/runtime/index.ts", root)).toBe(true);
  });

  test("a file of the app itself is not a package", () => {
    expect(isPackagePath("/home/me/app/src/alias.ts", root)).toBe(false);
  });
});
