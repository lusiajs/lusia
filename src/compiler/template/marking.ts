import type { AttrBinding } from "./types/attribute.ts";

const CLASS = "class";

/** Adds the scope classes to an element's attributes: merged into `class`, or a new `class` when it has none. */
export function withScopeClass(attrs: AttrBinding[], classes: string): AttrBinding[] {
  const existing = attrs.find((attr) => attr.name === CLASS);
  if (!existing) return [...attrs, { name: CLASS, parts: [classes] }];
  const merged = { name: CLASS, parts: [`${classes} `, ...existing.parts] };
  return attrs.map((attr) => (attr === existing ? merged : attr));
}
