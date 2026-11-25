const SCRIPT = /<script\b[\s\S]*?<\/script>/gi;
const BODY_START = /<body[\s>]/i;
const HTML_START = /<html([^>]*)>/i;

export interface PageParts {
  /** The built index.html. Its script tags are kept; its head and body are replaced. */
  source: string;
  head: string;
  body: string;
  styleIds: string[];
  /** The shared CSS file, when there is one. */
  cssName?: string;
}

// The bundle writes "./chunk.js", which is wrong on a nested route such as /editor/.
function scriptsIn(text: string): string {
  return text.match(SCRIPT)?.map(rootedSource).join("\n") ?? "";
}

function rootedSource(script: string): string {
  return script.replace(/(\ssrc=")\.\//, "$1/");
}

/** The built index.html with a route's rendered head and body in place. */
export function assemblePage(parts: PageParts): string {
  const bodyAt = parts.source.search(BODY_START);
  const split = bodyAt === -1 ? parts.source.length : bodyAt;
  const htmlAttributes = HTML_START.exec(parts.source)?.[1] ?? "";
  const cssLink = parts.cssName
    ? `<link rel="stylesheet" href="/${parts.cssName}" data-lusia-ssr>`
    : "";
  return [
    "<!doctype html>",
    `<html${htmlAttributes} data-lusia-styles="${parts.styleIds.join(" ")}" data-lusia-ssr>`,
    "<head>",
    parts.head,
    scriptsIn(parts.source.slice(0, split)),
    cssLink,
    "</head>",
    "<body>",
    parts.body,
    scriptsIn(parts.source.slice(split)),
    "</body>",
    "</html>",
    "",
  ]
    .filter((line) => line !== "")
    .join("\n");
}
