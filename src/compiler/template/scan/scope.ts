import type { Template } from "../types/template.ts";

/** What one component file's markup shares across all its scanners. */
export interface ScanScope {
  components: ReadonlySet<string>;
  contentUsed: boolean;
  /** The classes every element gets, space-separated. Empty when the component has no styles. */
  classes: string;
}

export function isBlank(template: Template): boolean {
  return template.html.trim() === "" && template.bindings.length === 0;
}
