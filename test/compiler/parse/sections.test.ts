import { describe, expect, test } from "bun:test";
import { LusiaError } from "#compiler/errors/error.ts";
import { parse } from "#compiler/parse/sections.ts";

const FILE = "Card.lusia";

describe("parse", () => {
  test("splits script, style and markup", () => {
    const source = [
      "<script>",
      "const a = 1;",
      "</script>",
      "",
      "<h1>Hi</h1>",
      "",
      '<style lang="css">',
      "h1 { color: red; }",
      "</style>",
    ].join("\n");

    const parsed = parse(source, FILE);
    expect(parsed.script?.content).toBe("\nconst a = 1;\n");
    expect(parsed.styles[0]?.content).toBe("\nh1 { color: red; }\n");
    expect(parsed.markup).toBe("<h1>Hi</h1>");
  });

  test("reports the line where section content starts", () => {
    const source = ["<h1>Title</h1>", "", "<script>", "export const x = 1;", "</script>"].join(
      "\n",
    );
    const parsed = parse(source, FILE);
    expect(parsed.script?.line).toBe(3);
  });

  test("ignores <script> and <style> inside {} expressions and comments", () => {
    const source =
      '<script>const a = 1;</script>\n<p>{"<script>x</script>"}</p>\n<!-- <style>p{}</style> -->';
    const parsed = parse(source, FILE);
    expect(parsed.script?.content).toBe("const a = 1;");
    expect(parsed.styles).toEqual([]);
    expect(parsed.markup).toBe('<p>{"<script>x</script>"}</p>\n<!-- <style>p{}</style> -->');
  });

  test("keeps every <style> in source order", () => {
    const source =
      "<style>a {}</style>\n<p>x</p>\n<style scoped>b {}</style>\n<style global>c {}</style>";
    const parsed = parse(source, FILE);
    expect(parsed.styles.map((style) => style.content)).toEqual(["a {}", "b {}", "c {}"]);
    expect(parsed.styles.map((style) => style.attrs)).toEqual([{}, { scoped: "" }, { global: "" }]);
    expect(parsed.styles[2]?.line).toBe(4);
  });

  test("throws LusiaError on an unclosed section", () => {
    expect(() => parse("<style>p {}", FILE)).toThrow("unclosed <style>");
  });

  test("throws LusiaError on a duplicate <script>", () => {
    const source = "<script>const a = 1;</script>\n<script>const b = 2;</script>";
    expect(() => parse(source, FILE)).toThrow(LusiaError);
    expect(() => parse(source, FILE)).toThrow("only one <script> is allowed");
  });
});
