import { describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LusiaError } from "#compiler/errors/error.ts";
import { compileStyle, compileStyleResult, forgetStyles } from "#compiler/style/sass.ts";
import { FILE, ID, SCOPED, TREE } from "./fixtures.ts";

describe("compileStyle", () => {
  test("compiles SCSS nesting and variables, then scopes", () => {
    const style = {
      content: "$c: red;\n.a { color: $c; &:hover { color: blue; } }",
      attrs: {},
      line: 1,
      from: 0,
    };
    const out = compileStyle(style, FILE, ID);
    expect(out).toContain(`.a${TREE} {`);
    expect(out).toContain("color: red;");
    expect(out).toContain(`.a:hover${TREE} {`);
    expect(out).not.toContain("$c");
  });

  test("<style scoped> uses the scoped filter", () => {
    const style = { content: ".a { color: red; }", attrs: { scoped: "" }, line: 1, from: 0 };
    expect(compileStyle(style, FILE, ID)).toContain(`.a${SCOPED} {`);
  });

  test("<style global> leaves selectors unscoped", () => {
    const style = { content: "body { margin: 0; }", attrs: { global: "" }, line: 1, from: 0 };
    const out = compileStyle(style, FILE, ID);
    expect(out).toContain("body {");
    expect(out).not.toContain(TREE);
    expect(out).not.toContain(SCOPED);
  });

  test('lang="css" skips the Sass compiler', () => {
    const style = { content: "h1 { color: $c; }", attrs: { lang: "css" }, line: 1, from: 0 };
    const out = compileStyle(style, FILE, ID);
    expect(out).toContain("color: $c;");
    expect(out).toContain(`h1${TREE}`);
  });

  test("SCSS syntax error throws LusiaError with a line inside the file", () => {
    const style = { content: "\n.a {\n  color: red;\n", attrs: {}, line: 10, from: 0 };
    try {
      compileStyle(style, FILE, ID);
      throw new Error("expected compileStyle to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(LusiaError);
      const lusia = error as LusiaError;
      expect(lusia.line).toBeGreaterThanOrEqual(style.line);
      expect(lusia.line).toBeLessThan(style.line + style.content.split("\n").length);
    }
  });
});

describe("compileStyleResult cache", () => {
  let dir: string;
  let file: string;
  const style = {
    content: '@use "tokens";\n.a { color: tokens.$accent; }',
    attrs: {},
    line: 1,
    from: 0,
  };

  async function setup(): Promise<void> {
    dir = await mkdtemp(join(tmpdir(), "lusia-sass-"));
    file = join(dir, "Card.lusia");
    await writeFile(join(dir, "_tokens.scss"), "$accent: red;\n");
  }

  test("an unchanged style is a cache hit: no Sass time, same css", async () => {
    await setup();
    const first = compileStyleResult(style, file, ID, 0);
    const second = compileStyleResult(style, file, ID, 0);
    expect(first.deps.map((dep) => dep.path)).toEqual([join(dir, "_tokens.scss")]);
    expect(second.sassMs).toBe(0);
    expect(second.css).toBe(first.css);
    await rm(dir, { recursive: true, force: true });
  });

  test("a changed Sass partial is a miss and gives the new css", async () => {
    await setup();
    compileStyleResult(style, file, ID, 0);
    await writeFile(join(dir, "_tokens.scss"), "$accent: blue;\n");
    expect(compileStyleResult(style, file, ID, 0).css).toContain("color: blue;");
    await rm(dir, { recursive: true, force: true });
  });

  test("forgetStyles drops the file's entries", async () => {
    await setup();
    compileStyleResult(style, file, ID, 0);
    forgetStyles(file);
    compileStyleResult(style, file, ID, 0);
    expect(compileStyleResult(style, file, ID, 0).sassMs).toBe(0);
    await rm(dir, { recursive: true, force: true });
  });
});
