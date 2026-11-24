import type { ApiEntry } from "./types.ts";

export const componentFunctionEntries: ApiEntry[] = [
  {
    id: "props",
    name: "props()",
    kind: "function",
    group: "components",
    signature: "props<D extends Record<string, unknown>>(defaults: D): PropVariables<D>",
    summary: "Declares the props a component accepts, with defaults.",
    bullets: [
      "Call it only at the top level of <script>.",
      "Read a prop with .value. Writing it works only when the parent binds it with bind-<prop>.",
      "A prop the parent did not bind is read-only. Writing it throws.",
      "The default is used when a prop is missing, null or undefined.",
      "Keys become the attribute names parents can pass.",
    ],
    example: `const { label } = props({ label: "New" });`,
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
