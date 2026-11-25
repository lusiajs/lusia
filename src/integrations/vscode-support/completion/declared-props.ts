import { findPropsCall, parsePropDefs, type PropDef } from "#language/parse/props.ts";
import type { CompletionItemData } from "../completion-data.ts";
import { attributeValueNameAt } from "./attribute-value.ts";

/** The `<holder>.` members: one per field of `props(class {...})`. */
export function declaredPropItems(props: PropDef[]): CompletionItemData[] {
  return props.map((prop) => ({
    label: prop.name,
    kind: "property",
    insertText: prop.name,
    snippet: false,
    detail: propDetail(prop),
  }));
}

/** The details of the names that `const { ... } = props(class {...})` destructures. */
export function destructuredPropDetails(script: string): Map<string, string> {
  const call = findPropsCall(script);
  if (call?.binding.kind !== "destructure") return new Map();
  const names = call.binding.names;
  return new Map(
    parsePropDefs(script)
      .filter((prop) => names.includes(prop.name))
      .map((prop) => [prop.name, propDetail(prop)]),
  );
}

/** The choices of `tone="info" | "warn"` when the attribute being typed has them. */
export function propValueItems(
  text: string,
  offset: number,
  props: PropDef[],
): CompletionItemData[] | undefined {
  const name = attributeValueNameAt(text, offset);
  const choices = props.find((prop) => prop.name === name)?.choices;
  return choices?.map((choice) => ({
    label: choice,
    kind: "keyword",
    insertText: choice,
    snippet: false,
    detail: `Value of ${name}`,
  }));
}

/** `tone: "info" | "warn" = "info"`: the type when written, then the default. */
export function propSignature(prop: PropDef): string {
  const optional = prop.optional ? "?" : "";
  const type = prop.type === undefined ? "" : `: ${prop.type}`;
  const value = prop.defaultValue === undefined ? "" : ` = ${prop.defaultValue}`;
  return `${prop.name}${optional}${type}${value}`;
}

export function propDetail(prop: PropDef): string {
  return prop.type ?? (prop.defaultValue === undefined ? "Prop" : `default ${prop.defaultValue}`);
}
