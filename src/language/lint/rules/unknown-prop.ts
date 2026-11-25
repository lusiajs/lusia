import { componentPropName } from "#compiler/template/bind.ts";
import { componentAttributes } from "./component-attributes.ts";
import type { LintContext, LintFinding } from "../types.ts";

export function unknownProp(context: LintContext): LintFinding[] {
  return componentAttributes(context)
    .filter(({ declared, attribute }) => !declared.some((prop) => prop.name === componentPropName(attribute.name)))
    .map(({ component, attribute }) => unknownFinding(component, attribute.name, attribute.offset));
}

function unknownFinding(component: string, prop: string, offset: number): LintFinding {
  return {
    offset,
    code: "unknown-prop",
    message: `${component} does not declare a prop named "${prop}"`,
    severity: "warning",
  };
}
