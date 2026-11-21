export const TEXT_MARKER = "l";
export const ELEMENT_MARKER = "data-l-bind";
/** The class a component puts on every element it owns, for its scoped rules. */
export const scopeClass = (id: string): string => `l-${id}`;
/** The class a component puts on its own elements and every element inside it, for its tree rules. */
export const treeClass = (id: string): string => `t-${id}`;
