import ts from "typescript";

export type ExampleShape = "component" | "fragment" | "mixed" | "typescript";

const SECTION_TAG = /<(script|style)[\s>]/;
const MARKUP_LINE = /^\s*<[A-Za-z!/]/m;
const FRAGMENT_PRELUDE = 'import { variable, WHEN, EASE, PRESET } from "lusiajs";';

export function exampleShape(example: string): ExampleShape {
  if (SECTION_TAG.test(example)) return "component";
  if (!MARKUP_LINE.test(example)) return "typescript";
  return example.trimStart().startsWith("<") ? "fragment" : "mixed";
}

/** Turns an example into a full .lusia source the compiler can read. */
export function componentSource(example: string, shape: ExampleShape): string {
  if (shape === "component") return example;
  if (shape === "fragment") return wrapMarkup(FRAGMENT_PRELUDE, example);
  const index = example.search(MARKUP_LINE);
  return wrapMarkup(example.slice(0, index), example.slice(index));
}

// The markup stays at the top level: FALLBACK and NOLAZY must be top-level.
function wrapMarkup(code: string, markup: string): string {
  return `<script>\n${code.trim()}\n</script>\n\n${markup.trim()}\n`;
}

export function syntaxErrors(example: string): string[] {
  const { diagnostics = [] } = ts.transpileModule(example, {
    reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext },
    fileName: "example.ts",
  });
  return diagnostics.map((diagnostic) =>
    ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
  );
}
