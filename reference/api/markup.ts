import type { ApiEntry } from "./types.ts";

export const markupEntries: ApiEntry[] = [
  {
    id: "expr",
    name: "{expr}",
    kind: "markup",
    group: "basics",
    signature: "{expression}",
    summary: "Puts a TypeScript expression into text or an attribute.",
    bullets: [
      "In text, the value is inserted as text, not HTML.",
      "In a whole attribute, null, undefined and false remove it.",
      "It re-runs when a variable or computed variable it reads updates.",
      "Nested braces and strings are allowed.",
    ],
    example: `<p>Hi {name}</p>\n<button disabled={isDone}>Save</button>`,
  },
  {
    id: "html",
    name: "<HTML>{expr}</HTML>",
    kind: "markup",
    group: "components",
    signature: "<HTML>{expression}</HTML>",
    summary: "Inserts the expression's value as HTML, not as text.",
    bullets: [
      "Holds one {expression} and nothing else. Uppercase only: lowercase <html> is a normal tag.",
      "Each update replaces its nodes.",
      "Never pass untrusted input. The value runs as HTML, so a script or an onerror attribute can run code (XSS).",
      "Lusia markup inside the value is not compiled. Only plain HTML is shown.",
    ],
    example: `<script>\nimport { variable } from "lusiajs";\n\nconst note = variable("<b>Bold</b> text");\n</script>\n\n<HTML>{note}</HTML>`,
  },
  {
    id: "script",
    name: "<script>",
    kind: "markup",
    group: "basics",
    signature: "<script> TypeScript </script>",
    summary: "Holds the component's TypeScript: imports, state and props.",
    bullets: [
      "Always TypeScript. It takes no lang attribute.",
      "Imports run once per file.",
      "Declarations run once per instance.",
      "export is a compile error.",
    ],
    example: `<script>\nimport { variable } from "lusiajs";\nconst count = variable(0);\n</script>`,
  },
];
