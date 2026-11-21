import type { Template } from "../types/template.ts";

/** What one component file's markup shares across all its scanners. */
export interface ScanScope {
  components: ReadonlySet<string>;
  contentUsed: boolean;
  /** The scope class every element gets, when its styles match by class. */
  marker?: string;
}

export function isBlank(template: Template): boolean {
  return template.html.trim() === "" && template.bindings.length === 0;
}
