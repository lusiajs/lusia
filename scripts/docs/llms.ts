import type { ApiEntry } from "../../reference/api/types.ts";
import { orderedEntries } from "./api-order.ts";
import type { DocFiles } from "./links.ts";
import { rebaseLinks } from "./links.ts";

const SEPARATOR = "\n---\n\n";

function apiLine(entry: ApiEntry): string {
  return `- [${entry.name}](docs/api/${entry.id}.md): ${entry.summary}`;
}

export function buildLlmsTxt(entries: ApiEntry[], description: string): string {
  const lines = [
    "# Lusia",
    "",
    `> ${description}`,
    "",
    "## Start here",
    "",
    "- [Docs index](docs/README.md): every API page, error code and config option.",
    "",
    "## API",
    "",
    ...orderedEntries(entries).map(apiLine),
    "",
    "## Errors",
    "",
    "- [Error codes](docs/errors.md): every error code with its message and hint.",
    "",
    "## Config",
    "",
    "- [Config options](docs/config.md): every option for lusia.config.json.",
  ];
  return `${lines.join("\n")}\n`;
}

// The index first, then the API pages, errors and config.
function fullRank(path: string): number {
  if (path === "docs/README.md") return 0;
  if (path.startsWith("docs/api/")) return 1;
  if (path === "docs/errors.md") return 2;
  return 3;
}

function isFullPage(path: string): boolean {
  return path.startsWith("docs/") && path.endsWith(".md");
}

export function buildLlmsFullTxt(files: DocFiles): string {
  const pages = [...files]
    .filter(([path]) => isFullPage(path))
    .sort(([left], [right]) => fullRank(left) - fullRank(right) || left.localeCompare(right));
  const parts = pages.map(([path, content]) => rebaseLinks(content, path).trimEnd());
  return `${parts.join(SEPARATOR)}\n`;
}
