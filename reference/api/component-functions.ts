import type { ApiEntry } from "./types.ts";

export const componentFunctionEntries: ApiEntry[] = [
  {
    id: "props",
    name: "props()",
    kind: "function",
    group: "components",
    signature: "props(class { name = defaultValue; })",
    summary: "Declares the props a component accepts, with defaults.",
    bullets: [
      "Call it once at the top level of <script> with a class. Each field is a prop, and its value is the default used when the parent passes nothing, null or undefined.",
      "Destructure the result to read props by name: const { tone } = props(class {...}). The names stay live. The object form, const p = props(class {...}), reads p.tone and takes any name.",
      "Field names become the attribute names parents can pass. Writing a prop works only when the parent binds it with bind-<name>. Otherwise it throws.",
      'A field with a literal union type, such as "info" | "warn", lists the allowed values. The linter warns when a parent passes another value.',
      "A prop name can't be declared again in the component (L1056).",
    ],
    example: `<script>\n  import { props } from "lusiajs";\n\n  const { label, tone } = props(class {\n    label = "New";\n    tone: "info" | "warn" = "info";\n  });\n</script>\n\n<span class="badge {tone}">{label}</span>`,
  },
  {
    id: "attach",
    name: "attach()",
    kind: "function",
    group: "components",
    signature: "attach(component: Component, target: Element, props?: Props): Instance",
    summary: "Mounts a component into an element on the page.",
    bullets: [
      "Returns an Instance for later cleanup.",
      "Pass props as a record of getter functions.",
      "detach() stops updates and removes the nodes. It returns a Promise that waits for DETACH animations.",
    ],
    example: `const counter = attach(Counter, document.getElementById("slot")!);\ncounter.detach();`,
  },
  {
    id: "detach",
    name: "detach()",
    kind: "function",
    group: "components",
    signature: "detach(): Promise<void>",
    summary: "Removes a mounted component and stops its updates.",
    bullets: [
      "Call it on the Instance returned by attach().",
      "It stops the component's updates and removes its nodes from the page.",
      "It waits for DETACH animations before the Promise resolves.",
      "Await it when the DOM must be gone before the next step.",
      "An instance cannot be mounted again. Create a new one with attach().",
    ],
    example: `<script>\nimport { attach } from "lusiajs";\nimport Card from "./Card.lusia";\n\nconst panel = attach(Card, document.getElementById("slot")!);\n\nasync function close() {\n  await panel.detach();\n}\n</script>\n\n<div id="slot"></div>\n<button onclick={close}>Close</button>`,
  },
];
