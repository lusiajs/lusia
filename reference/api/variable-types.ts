import type { ApiEntry } from "./types.ts";

export const variableTypeEntries: ApiEntry[] = [
  {
    id: "variable-type",
    name: "Variable",
    kind: "type",
    group: "reactivity",
    signature: "interface Variable<T> { value: T; get(): T; set(value: T): void; peek(): T }",
    summary: "The type returned by variable().",
    bullets: [
      "value, get() and set() read and write it.",
      "peek() reads without tracking.",
      "Passed to functions when the caller may write the value.",
    ],
    example: `function reset(count: Variable<number>) {\n  count.value = 0;\n}`,
  },
  {
    id: "computed-variable-type",
    name: "ComputedVariable",
    kind: "type",
    group: "reactivity",
    signature: "interface ComputedVariable<T> { readonly value: T; get(): T; peek(): T }",
    summary: "The type returned by variable.compute() and props().",
    bullets: [
      "value and get() read it. It has no set().",
      "peek() reads without tracking.",
      "Passed to functions when the caller only reads the value.",
    ],
    example: `function show(total: ComputedVariable<number>) {\n  return total.value;\n}`,
  },
];
