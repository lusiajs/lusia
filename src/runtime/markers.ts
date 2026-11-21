export const TEXT_MARKER = "l";
export const ELEMENT_MARKER = "data-l-bind";
export const COMPONENT_ATTR = "data-l";
/** The class a component puts on every element it owns, so styles can match by class instead of by ancestor. */
export const scopeClass = (id: string): string => `l-${id}`;
