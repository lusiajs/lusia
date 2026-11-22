import { LusiaError } from "../errors/error.ts";
import type { Section } from "../parse/sections.ts";
import type { Screens } from "#runtime/screen/screens.ts";
import type { StyleResult } from "./sass.ts";
import { screenMedia } from "./screen-media.ts";

/** Wraps a style that sits inside `<IF {SCREEN.X}>` in its media query. A style that never applies is dropped. */
export function withScreenMedia(
  result: StyleResult,
  style: Section,
  screens: Screens,
  file: string,
): StyleResult {
  const media = mediaOf(style, screens, file);
  if (media === undefined) return result;
  const css = media === "" ? "" : `@media ${media} {\n${result.css}\n}`;
  return { ...result, css };
}

function mediaOf(style: Section, screens: Screens, file: string): string | undefined {
  try {
    return screenMedia(style.branches ?? [], screens);
  } catch (error) {
    if (error instanceof LusiaError) Object.assign(error, { file, line: style.line, column: 1 });
    throw error;
  }
}
