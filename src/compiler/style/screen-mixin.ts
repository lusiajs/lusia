import type * as sass from "sass";
import { screenRanges, type Screens } from "#runtime/screen/screens.ts";
import { widthQuery } from "#runtime/screen/width.ts";

const MODULE_URL = "lusia:screen";

/** Loads the screen() mixin before every style. It stays on line 1, so error lines do not move. */
export const SCREEN_USE = `@use "${MODULE_URL}" as *; `;

/** Serves the screen() mixin for the build's screen sizes. Only the lusia:screen URL is handled. */
export function screenImporter(screens: Screens): sass.Importer {
  return {
    canonicalize: (url) => (url === MODULE_URL ? new URL(url) : null),
    load: () => ({ contents: screenModule(screens), syntax: "scss" }),
  };
}

/** The column in the user's style. Only the first line holds the SCREEN_USE prefix. */
export function styleColumn(span: sass.SourceSpan): number {
  const column = span.start.column + 1;
  return span.start.line === 0 ? column - SCREEN_USE.length : column;
}

export function screenModule(screens: Screens): string {
  const ranges = screenRanges(screens);
  const media = ranges.map((range) => `  "${range.name}": "${widthQuery(range)}",`).join("\n");
  const names = ranges.map((range) => range.name).join(", ");
  return [
    '@use "sass:list";',
    '@use "sass:map";',
    "",
    `$-media: (\n${media}\n);`,
    "",
    "@mixin screen($names...) {",
    "  $queries: ();",
    "  @each $name in $names {",
    "    $query: map.get($-media, $name);",
    "    @if $query == null {",
    `      @error "Unknown screen #{$name}. Use one of: ${names}";`,
    "    }",
    "    $queries: list.append($queries, $query, comma);",
    "  }",
    "  @media #{$queries} {",
    "    @content;",
    "  }",
    "}",
    "",
  ].join("\n");
}
