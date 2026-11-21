import { scopeClass, treeClass } from "#runtime/markers.ts";
import { classFilter } from "./scope.ts";

/** The scope classes a component's compiled CSS uses. Empty when its styles have no rules of that mode. */
export interface ScopeClasses {
  scoped: string;
  tree: string;
}

function usedClass(css: string, className: string): string {
  return css.includes(classFilter(className)) ? className : "";
}

export function scopeClassesOf(css: string, id: string): ScopeClasses {
  return { scoped: usedClass(css, scopeClass(id)), tree: usedClass(css, treeClass(id)) };
}

/** The classes every element of the component's template gets, space-separated. */
export function ownClassNames(scopes: ScopeClasses): string {
  return [scopes.scoped, scopes.tree].filter(Boolean).join(" ");
}
