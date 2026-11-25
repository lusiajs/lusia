import { componentAttributes } from "./component-attributes.ts";
import type { LintContext, LintFinding } from "../types.ts";

const STATIC_VALUE = /[\w:.-]+\s*=\s*(?:"([^"]*)"|'([^']*)')/y;

export function propChoice(context: LintContext): LintFinding[] {
  return componentAttributes(context).flatMap(({ declared, attribute }) => {
    const choices = declared.find((prop) => prop.name === attribute.name)?.choices;
    const value = staticValue(context.markup, attribute.offset);
    if (!choices || value === undefined || choices.includes(value)) return [];
    return [choiceFinding(attribute.offset, attribute.name, value, choices)];
  });
}

function staticValue(markup: string, offset: number): string | undefined {
  STATIC_VALUE.lastIndex = offset;
  const match = STATIC_VALUE.exec(markup);
  return match ? (match[1] ?? match[2]) : undefined;
}

function choiceFinding(offset: number, prop: string, value: string, choices: string[]): LintFinding {
  const options = choices.map((choice) => `"${choice}"`).join(", ");
  return {
    offset,
    code: "prop-choice",
    message: `"${value}" is not a choice for ${prop}. Use one of: ${options}.`,
    severity: "warning",
  };
}
