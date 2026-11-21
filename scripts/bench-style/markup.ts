export interface ElementMark {
  attributes: string;
  classes: string[];
}

export type Mark = (componentId: string, isRoot: boolean) => ElementMark;

export const NO_MARK: ElementMark = { attributes: "", classes: [] };

export interface Scope {
  id: string;
  mark: Mark;
}

export interface ElementOptions {
  root?: boolean;
  attributes?: string;
}

export function element(
  scope: Scope,
  name: string,
  classes: string[],
  inner = "",
  options: ElementOptions = {},
): string {
  const mark = scope.mark(scope.id, options.root ?? false);
  const className = [...classes, ...mark.classes].join(" ");
  const attributes = `${mark.attributes}${options.attributes ?? ""}`;
  return `<${name} class="${className}"${attributes}>${inner}</${name}>`;
}
