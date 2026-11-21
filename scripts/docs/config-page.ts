import { codeSpan, linkTo, tableHeader, tableRow } from "./markdown.ts";
import { flattenOptions, type SchemaDefs, type SchemaNode } from "./config-options.ts";

export function buildConfigPage(schema: SchemaNode & { $defs?: SchemaDefs }): string {
  const options = flattenOptions(schema.properties ?? {}, schema.$defs ?? {});
  const rows = options.map((option) =>
    tableRow([
      codeSpan(option.name),
      option.type,
      codeSpan(option.defaultValue),
      option.description,
    ]),
  );
  const lines = [
    "# Config options",
    "",
    schema.description ?? "",
    "",
    ...tableHeader(["Name", "Type", "Default", "Description"]),
    ...rows,
    "",
    linkTo("Back to the index", "README.md"),
  ];
  return `${lines.join("\n")}\n`;
}
