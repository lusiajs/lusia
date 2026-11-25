import type { ApiEntry } from "./types.ts";

export const componentTypeEntries: ApiEntry[] = [
  {
    id: "component",
    name: "Component",
    kind: "type",
    group: "components",
    signature: "(target: Element, props?: Props): Instance",
    summary: "A compiled .lusia component. Pass it to attach().",
    bullets: [
      "Each .lusia file default-exports one Component.",
      "Calling it places the component inside target.",
      "Use attach() to mount it from code.",
    ],
    example: `import Counter from "./Counter.lusia";\nattach(Counter, slot);`,
  },
  {
    id: "instance",
    name: "Instance",
    kind: "type",
    group: "components",
    signature: "interface Instance { root: Element; detach(): Promise<void> }",
    summary: "A mounted component, returned by attach().",
    bullets: [
      "attach() returns one when it places a component on the page.",
      "root is the element the component was mounted into.",
      "Call detach() to remove the component and stop its updates.",
      "Keep the instance if you need to remove the component later.",
    ],
    example: `const panel: Instance = attach(Card, slot);\npanel.root; // the slot element\nawait panel.detach();`,
  },
  {
    id: "props-type",
    name: "Props",
    kind: "type",
    group: "components",
    signature: "type Props = Record<string, () => unknown>",
    summary: "The props object passed to a component.",
    bullets: [
      "Each key is a prop name.",
      "Each value is a getter that returns the current value.",
      "The component reads each prop it declares with props() from this record.",
    ],
    example: `function label() {\n  return "Done";\n}\n\nconst passed: Props = { label };`,
  },
];
