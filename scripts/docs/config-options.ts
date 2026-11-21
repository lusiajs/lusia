export interface SchemaNode {
  type?: string;
  enum?: string[];
  default?: unknown;
  description?: string;
  $ref?: string;
  oneOf?: SchemaNode[];
  anyOf?: SchemaNode[];
  properties?: Record<string, SchemaNode>;
}

export interface SchemaDefs {
  [name: string]: SchemaNode;
}

export interface ConfigOption {
  name: string;
  type: string;
  defaultValue: string;
  description: string;
}

const DEFAULT_MARK = "Default: ";

function resolveNode(node: SchemaNode, defs: SchemaDefs): SchemaNode {
  if (!node.$ref) return node;
  const definition = defs[node.$ref.replace("#/$defs/", "")] ?? {};
  const { $ref: _ref, ...rest } = node;
  return { ...definition, ...rest };
}

function typeLabel(node: SchemaNode, defs: SchemaDefs): string {
  if (node.enum) return `enum: ${node.enum.join(", ")}`;
  const choices = node.oneOf ?? node.anyOf;
  if (choices)
    return choices.map((choice) => typeLabel(resolveNode(choice, defs), defs)).join(" or ");
  return node.type ?? "any";
}

// The description may end with "Default: ..."; that part becomes the default column.
function splitDefault(text: string): { description: string; defaultValue: string | undefined } {
  const index = text.indexOf(DEFAULT_MARK);
  if (index === -1) return { description: text, defaultValue: undefined };
  return {
    description: text.slice(0, index).trim(),
    defaultValue: text.slice(index + DEFAULT_MARK.length).trim(),
  };
}

function defaultLabel(node: SchemaNode, fromText: string | undefined): string {
  if (node.default !== undefined) return JSON.stringify(node.default);
  return fromText ?? "-";
}

function optionFrom(name: string, node: SchemaNode, defs: SchemaDefs, description: string) {
  const split = splitDefault(description);
  return {
    name,
    type: typeLabel(node, defs),
    defaultValue: defaultLabel(node, split.defaultValue),
    description: split.description,
  };
}

// Nested keys get dotted names. A key with no description takes its parent's text.
export function flattenOptions(
  properties: Record<string, SchemaNode>,
  defs: SchemaDefs,
  prefix = "",
  inherited = "",
): ConfigOption[] {
  return Object.entries(properties)
    .filter(([key]) => !key.startsWith("$"))
    .flatMap(([key, child]) => {
      const node = resolveNode(child, defs);
      const name = prefix ? `${prefix}.${key}` : key;
      const description = node.description ?? inherited;
      if (node.properties) return flattenOptions(node.properties, defs, name, description);
      return [optionFrom(name, node, defs, description)];
    });
}
