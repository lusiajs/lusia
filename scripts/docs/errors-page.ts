import type { ErrorCode } from "../../src/compiler/errors/codes.ts";
import { codeSpan, linkTo, tableHeader, tableRow } from "./markdown.ts";

const RANGE_ROWS: [string, string][] = [
  ["L1xxx", "Compile errors in `.lusia` files"],
  ["L2xxx", "Runtime checks on values the compiled code passes in"],
  ["L3xxx", "Bundler errors from Bun.build, such as a missing export"],
];

function byCode([left]: [string, ErrorCode], [right]: [string, ErrorCode]): number {
  return left.localeCompare(right);
}

function codeRow([name, code]: [string, ErrorCode]): string {
  return tableRow([name, codeSpan(code.message), code.hint]);
}

export function buildErrorsPage(codes: Record<string, ErrorCode>): string {
  const sorted = Object.entries(codes).sort(byCode);
  const lines = [
    "# Error codes",
    "",
    "Each error has a code, a message and a hint. Placeholders such as `$name` are filled in when the error is raised.",
    "",
    ...tableHeader(["Range", "Where it comes from"]),
    ...RANGE_ROWS.map(([range, where]) => tableRow([range, where])),
    "",
    ...tableHeader(["Code", "Message", "Hint"]),
    ...sorted.map(codeRow),
    "",
    linkTo("Back to the index", "README.md"),
  ];
  return `${lines.join("\n")}\n`;
}
