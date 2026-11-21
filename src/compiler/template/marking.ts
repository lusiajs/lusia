import type { AttrBinding } from "./types/attribute.ts";
import type { Template } from "./types/template.ts";

/** A template can carry the scope class on every element only if it holds nothing that renders markup it does not own. */
export function ownsAllMarkup(template: Template): boolean {
  return template.bindings.every((binding) => {
    switch (binding.kind) {
      case "component":
      case "content":
      case "html":
        return false;
      case "if":
        return binding.branches.every((branch) => ownsAllMarkup(branch.body));
      case "each":
      case "for":
        return ownsAllMarkup(binding.body);
      default:
        return true;
    }
  });
}

const CLASS = "class";

/** Adds the scope class to an element's attributes: merged into `class`, or a new `class` when it has none. */
export function withScopeClass(attrs: AttrBinding[], marker: string): AttrBinding[] {
  const existing = attrs.find((attr) => attr.name === CLASS);
  if (!existing) return [...attrs, { name: CLASS, parts: [marker] }];
  const merged = { name: CLASS, parts: [`${marker} `, ...existing.parts] };
  return attrs.map((attr) => (attr === existing ? merged : attr));
}
