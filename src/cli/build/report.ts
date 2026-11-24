import { join } from "node:path";

export interface FileRow {
  path: string;
  size: number;
  gzip: number;
}

const KB = 1024;
const MB = KB * KB;

export async function fileRows(root: string): Promise<FileRow[]> {
  const paths = await Array.fromAsync(new Bun.Glob("**/*").scan({ cwd: root, onlyFiles: true }));
  paths.sort();
  return Promise.all(paths.map((path) => fileRow(root, path)));
}

async function fileRow(root: string, path: string): Promise<FileRow> {
  const bytes = await Bun.file(join(root, path)).bytes();
  return { path, size: bytes.byteLength, gzip: Bun.gzipSync(bytes).byteLength };
}

export function formatReport(rows: FileRow[]): string {
  const total = rows.reduce(
    (sum, row) => ({ size: sum.size + row.size, gzip: sum.gzip + row.gzip }),
    { size: 0, gzip: 0 },
  );
  const table = [
    ["File", "Size", "Gzip"],
    ...rows.map((row) => [row.path, formatSize(row.size), formatSize(row.gzip)]),
    ["Total", formatSize(total.size), formatSize(total.gzip)],
  ];
  return formatTable(table);
}

function formatSize(bytes: number): string {
  if (bytes >= MB) return `${(bytes / MB).toFixed(1)} MB`;
  if (bytes >= KB) return `${(bytes / KB).toFixed(1)} KB`;
  return `${bytes} B`;
}

/** Left-aligns the first column and right-aligns the rest. The first row is the header. */
export function formatTable(rows: string[][]): string {
  const widths = rows[0]!.map((_, column) =>
    Math.max(...rows.map((row) => row[column]?.length ?? 0)),
  );
  const lines = rows.map((row) =>
    row.map((cell, column) => alignCell(cell, widths[column]!, column)).join("  "),
  );
  const rule = "-".repeat(lines[0]!.length);
  return [lines[0], rule, ...lines.slice(1, -1), rule, lines.at(-1)].join("\n");
}

function alignCell(cell: string, width: number, column: number): string {
  return column === 0 ? cell.padEnd(width) : cell.padStart(width);
}
