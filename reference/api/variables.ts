import type { ApiEntry } from "./types.ts";

export const variableEntries: ApiEntry[] = [
  {
    id: "variable",
    name: "variable()",
    kind: "function",
    group: "reactivity",
    signature: "variable<T>(initial: T): Variable<T>",
    summary: "Creates a value that updates the page when it updates.",
    bullets: [
      ".value reads and writes the value. .get() and .set(value) do the same.",
      ".peek() reads it without subscribing to updates.",
      "Writes with the same value do nothing.",
      "Reads inside markup and variable.compute() are tracked.",
    ],
    example: `const count = variable(0);\ncount.value++;`,
  },
  {
    id: "variable-compute",
    name: "variable.compute()",
    kind: "function",
    group: "reactivity",
    signature: "variable.compute<T>(fn: () => T): ComputedVariable<T>",
    summary: "Creates a read-only value derived from other variables.",
    bullets: [
      "Re-runs only when a variable it reads updates.",
      "Read it with .value or .get(). It has no set(): write to the variables it reads.",
      ".peek() reads it without subscribing to updates.",
    ],
    example: `const double = variable.compute(() => count.value * 2);`,
  },
  {
    id: "variable-auto-run",
    name: "variable.autoRun()",
    kind: "function",
    group: "reactivity",
    signature: "variable.autoRun(fn: () => void): () => void",
    summary: "Runs fn now, then again when a variable or computed variable it read updates.",
    bullets: [
      "Runs fn once right away, then only when a value it read updates.",
      "Reads are tracked on every run, so conditional reads work.",
      "Returns a stop function.",
      "Inside a component's <script>, it stops when the component is removed.",
    ],
    example: `import { variable } from "lusiajs";\n\nconst count = variable(0);\n\nfunction logCount() {\n  console.log("count is", count.value);\n}\n\nconst stop = variable.autoRun(logCount);\ncount.value++; // logs again\nstop();`,
  },
  {
    id: "variable-watch",
    name: "variable.watch()",
    kind: "function",
    group: "reactivity",
    signature:
      "variable.watch(variables: Variable[] | ComputedVariable[], fn: () => void, options?: { onInit?: boolean }): () => void",
    summary: "Runs fn when one of the listed variables updates.",
    bullets: [
      "Runs fn once right away. Pass { onInit: false } to skip that first run.",
      "Reads inside fn are not tracked: only the listed variables cause a run.",
      "Returns a stop function.",
      "Inside a component's <script>, it stops when the component is removed.",
    ],
    example: `import { variable } from "lusiajs";\n\nconst first = variable("Ada");\nconst last = variable("Lovelace");\n\nconst stop = variable.watch([first, last], () => {\n  console.log("name is", first.value, last.value);\n});\nfirst.value = "Grace"; // logs again\nstop();`,
  },
  {
    id: "variable-instance-on-update",
    name: "count.onUpdate() on one variable",
    kind: "function",
    group: "reactivity",
    signature:
      "count.onUpdate(fn: (now: T, before: T | undefined) => void, options?: { onInit?: boolean }): () => void",
    summary: "Runs fn with the new and the old value after each update.",
    bullets: [
      "Runs once right away with before undefined. Pass { onInit: false } to skip that.",
      "Runs after each update. Writes with the same value do nothing.",
      "Returns a stop function.",
      "Inside a component's <script>, it stops when the component is removed.",
    ],
    example: `const count = variable(0);\n\nconst stop = count.onUpdate((now, before) => {\n  console.log(before, "to", now);\n}); // logs undefined to 0\ncount.value++; // logs 0 to 1\nstop();`,
  },
];
