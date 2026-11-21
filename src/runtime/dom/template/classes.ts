import { TREE_CLASS_PATTERN } from "../../markers.ts";

/** Two space-separated class lists in one, skipping an empty list. */
export function joinClasses(first: string, second: string): string {
  if (first === "") return second;
  if (second === "") return first;
  return `${first} ${second}`;
}

/** A dynamic class value with the inherited tree classes added. Without inherited classes it is returned as is. */
export function withInheritedClasses(value: unknown, inherited: string): unknown {
  if (inherited === "") return value;
  return joinClasses(toClassText(value), inherited);
}

function toClassText(value: unknown): string {
  return value == null || value === false ? "" : String(value);
}

/** The tree classes an element carries. A component mounted into it inherits them. */
export function treeClassesOf(target: Node): string {
  if (target.nodeType !== Node.ELEMENT_NODE) return "";
  return [...(target as Element).classList]
    .filter((name) => TREE_CLASS_PATTERN.test(name))
    .join(" ");
}

/** Adds each class to every element under `root`. */
export function addClasses(root: DocumentFragment, classes: string): void {
  if (classes === "") return;
  const names = classes.split(" ");
  for (const el of root.querySelectorAll("*")) el.classList.add(...names);
}
