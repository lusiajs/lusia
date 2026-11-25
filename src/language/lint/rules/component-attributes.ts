import { parseLusiaImports } from "../../parse/imports.ts";
import type { PropDef } from "../../parse/props.ts";
import { tagAttributes, type AttributeName } from "../attributes.ts";
import type { LintContext } from "../types.ts";

const COMPONENT_TAG = /<([A-Za-z][\w.-]*)/g;

export interface ComponentAttribute {
  component: string;
  declared: PropDef[];
  attribute: AttributeName;
}

/** Attributes on tags of imported components whose child props can be read. */
export function componentAttributes({ script, markup, childProps }: LintContext): ComponentAttribute[] {
  const imported = new Set(parseLusiaImports(script).map((item) => item.name));
  return [...markup.matchAll(COMPONENT_TAG)].flatMap((tag) => {
    const component = tag[1] ?? "";
    const declared = imported.has(component) ? childProps(component) : undefined;
    if (!declared) return [];
    return tagAttributes(markup, tag.index + 1 + component.length).map((attribute) => ({
      component,
      declared,
      attribute,
    }));
  });
}
