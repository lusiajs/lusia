import { afterAll, describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isIgnoredPath, readIgnore } from "#cli/utils/ignore.ts";

const dirs: string[] = [];

afterAll(async () => {
  await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
});

async function rulesFor(gitignore: string | undefined) {
  const dir = await mkdtemp(join(tmpdir(), "lusia-ignore-"));
  dirs.push(dir);
  if (gitignore !== undefined) await writeFile(join(dir, ".gitignore"), gitignore);
  return readIgnore(dir);
}

describe("readIgnore", () => {
  test("a missing .gitignore skips dot folders and the top-level output folder", async () => {
    const rules = await rulesFor(undefined);
    expect(isIgnoredPath(rules, "dist/index.html", false)).toBe(true);
    expect(isIgnoredPath(rules, ".storybook/main.lusia", false)).toBe(true);
    expect(isIgnoredPath(rules, "public/dist/logo.svg", false)).toBe(false);
    expect(isIgnoredPath(rules, "src/Hero.lusia", false)).toBe(false);
  });

  test("blank lines and comments are skipped", async () => {
    const rules = await rulesFor("# build output\n\n  \ndist\n");
    expect(isIgnoredPath(rules, "dist", true)).toBe(true);
    expect(isIgnoredPath(rules, "# build output", false)).toBe(false);
  });

  test("always ignores node_modules, .lusia and .git, even with negation", async () => {
    const rules = await rulesFor("!node_modules\n!.git\n!.lusia\n");
    expect(isIgnoredPath(rules, "node_modules/x/index.ts", false)).toBe(true);
    expect(isIgnoredPath(rules, ".git/HEAD", false)).toBe(true);
    expect(isIgnoredPath(rules, ".lusia/screens.d.ts", false)).toBe(true);
    expect(isIgnoredPath(rules, "src/node_modules/a.lusia", false)).toBe(true);
  });

  test("CRLF line endings work", async () => {
    const rules = await rulesFor("dist\r\ncoverage\r\n");
    expect(isIgnoredPath(rules, "coverage", true)).toBe(true);
  });
});

describe("isIgnoredPath", () => {
  test("a plain name matches at any depth, as a file or a folder", async () => {
    const rules = await rulesFor("dist\n");
    expect(isIgnoredPath(rules, "dist", true)).toBe(true);
    expect(isIgnoredPath(rules, "dist", false)).toBe(true);
    expect(isIgnoredPath(rules, "public/dist/logo.svg", false)).toBe(true);
    expect(isIgnoredPath(rules, "src/Hero.lusia", false)).toBe(false);
  });

  test("a file inside an ignored folder is ignored", async () => {
    const rules = await rulesFor("dist\n");
    expect(isIgnoredPath(rules, "dist/assets/app.js", false)).toBe(true);
  });

  test("a trailing slash matches folders only", async () => {
    const rules = await rulesFor("drafts/\n");
    expect(isIgnoredPath(rules, "drafts", true)).toBe(true);
    expect(isIgnoredPath(rules, "drafts", false)).toBe(false);
    expect(isIgnoredPath(rules, "drafts/Note.lusia", false)).toBe(true);
    expect(isIgnoredPath(rules, "app/drafts", true)).toBe(true);
  });

  test("a leading slash anchors the pattern at the app root", async () => {
    const rules = await rulesFor("/dist\n");
    expect(isIgnoredPath(rules, "dist/index.html", false)).toBe(true);
    expect(isIgnoredPath(rules, "public/dist/logo.svg", false)).toBe(false);
  });

  test("a slash in the middle also anchors the pattern", async () => {
    const rules = await rulesFor("src/generated\n");
    expect(isIgnoredPath(rules, "src/generated", true)).toBe(true);
    expect(isIgnoredPath(rules, "lib/src/generated", true)).toBe(false);
  });

  test("* matches within one folder name", async () => {
    const rules = await rulesFor("*.tmp.lusia\n");
    expect(isIgnoredPath(rules, "src/Hero.tmp.lusia", false)).toBe(true);
    expect(isIgnoredPath(rules, "src/Hero.lusia", false)).toBe(false);
  });

  test("? matches one character", async () => {
    const rules = await rulesFor("Card?.lusia\n");
    expect(isIgnoredPath(rules, "Card1.lusia", false)).toBe(true);
    expect(isIgnoredPath(rules, "Card12.lusia", false)).toBe(false);
  });

  test("** matches across folders, including zero of them", async () => {
    const rules = await rulesFor("**/cache/*.json\n");
    expect(isIgnoredPath(rules, "cache/a.json", false)).toBe(true);
    expect(isIgnoredPath(rules, "x/y/cache/a.json", false)).toBe(true);
    expect(isIgnoredPath(rules, "x/cache/a.txt", false)).toBe(false);
  });

  test("a trailing /** matches everything inside the folder", async () => {
    const rules = await rulesFor("docs/**\n");
    expect(isIgnoredPath(rules, "docs/guide/index.md", false)).toBe(true);
    expect(isIgnoredPath(rules, "docs", true)).toBe(false);
  });

  test("a later ! line re-includes an entry, and the last match wins", async () => {
    const rules = await rulesFor("*.lusia\n!Keep.lusia\n");
    expect(isIgnoredPath(rules, "src/Hero.lusia", false)).toBe(true);
    expect(isIgnoredPath(rules, "src/Keep.lusia", false)).toBe(false);
  });

  test("a negation before the rule it overrides does not re-include", async () => {
    const rules = await rulesFor("!Keep.lusia\n*.lusia\n");
    expect(isIgnoredPath(rules, "src/Keep.lusia", false)).toBe(true);
  });

  test("regex characters in a name are literal", async () => {
    const rules = await rulesFor("a+b.lusia\n");
    expect(isIgnoredPath(rules, "a+b.lusia", false)).toBe(true);
    expect(isIgnoredPath(rules, "aab.lusia", false)).toBe(false);
  });

  test("a dot folder is not ignored unless the .gitignore says so", async () => {
    const rules = await rulesFor("dist\n");
    expect(isIgnoredPath(rules, ".storybook/main.lusia", false)).toBe(false);
  });
});
