export function escapeCell(text: string): string {
  return text.replaceAll("|", "\\|");
}

export function tableRow(cells: string[]): string {
  return `| ${cells.map(escapeCell).join(" | ")} |`;
}

export function tableHeader(columns: string[]): string[] {
  return [tableRow(columns), tableRow(columns.map(() => "---"))];
}

export function codeSpan(text: string): string {
  return `\`${text}\``;
}

export function linkTo(label: string, target: string): string {
  return `[${label}](${target})`;
}
