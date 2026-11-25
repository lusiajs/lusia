import { describe, expect, test } from "bun:test";
import { compile } from "#compiler/index.ts";
import { catchError } from "./catch-error.ts";

const FILE = `${process.cwd()}/test/compiler/Badge.lusia`;
const IMPORT = `import { props } from "lusiajs";\n`;

function script(body: string): string {
  return `<script>\n${IMPORT}${body}\n</script>\n<p>x</p>`;
}

describe("props(class {...})", () => {
  test("passes the field names as the keys argument", () => {
    const source = script(`const { label, count } = props(class {\n  label = "New";\n  count?: number;\n});`);
    const { code } = compile(source, FILE);
    expect(code).toContain('const __props = props(class {\n  label = "New";\n  count?: number;\n}, ["label","count"]);');
  });

  test("keeps the props call in dev mode", () => {
    const source = script(`const { label } = props(class {\n  label = "New";\n});`);
    expect(() => compile(source, FILE, { dev: true })).not.toThrow();
  });

  test("a second props() call is an error", () => {
    const source = script(`const { a } = props(class {\n  a = 1;\n});\nconst p = props(class {\n  b = 2;\n});`);
    const error = catchError(() => compile(source, FILE));
    expect(error.message).toBe("props() is called twice");
    expect(error.code).toBe("L1054");
  });

  test("calling props() with an object is an error", () => {
    const source = script(`const { a } = props({ a: 1 });`);
    const error = catchError(() => compile(source, FILE));
    expect(error.message).toBe("props() takes a class");
    expect(error.code).toBe("L1055");
  });
});

describe("props() prop reads", () => {
  test("rewrites reads, writes and shorthand in the script", () => {
    const source = script(`const { label } = props(class {\n  label = "New";\n});\nconst o = { label };\nlabel = "x";`);
    const { code } = compile(source, FILE);
    expect(code).toContain('const o = { label: __props.label };');
    expect(code).toContain('__props.label = "x";');
  });

  test("rewrites markup expressions, including bind targets", () => {
    const source = script(`const { label } = props(class {\n  label = "New";\n});`).replace(
      "<p>x</p>",
      '<input bind-checked={label} /><b title={label.trim()}>{label}</b>',
    );
    const { code } = compile(source, FILE);
    expect(code).toContain('__propTarget(__props, "label")');
    expect(code).toContain("__unwrap((__props.label.trim()))");
  });

  test("the object form reads through its name", () => {
    const source = script(`const p = props(class {\n  tone: "info" | "warn" = "info";\n});`).replace(
      "<p>x</p>",
      '<input bind-checked={p.tone} />',
    );
    const { code } = compile(source, FILE);
    expect(code).toContain('const p = props(class {\n  tone: "info" | "warn" = "info";\n}, ["tone"]);');
    expect(code).toContain('__propTarget(p, "tone")');
  });

  test("a prop name declared again is an error", () => {
    const source = script(`const { label } = props(class {\n  label = "New";\n});\nfunction f(label) { return label; }`);
    const error = catchError(() => compile(source, FILE));
    expect(error.code).toBe("L1056");
    expect(error.message).toBe("`label` is a prop, so it can't be declared again");
  });

  test("a loop name that reuses a prop is an error", () => {
    const source = script(`const { label } = props(class {\n  label = "New";\n});`).replace(
      "<p>x</p>",
      "<EACH {[1]} as={label}><i>{label}</i></EACH>",
    );
    const error = catchError(() => compile(source, FILE));
    expect(error.code).toBe("L1056");
  });
});
