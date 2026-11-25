import { lusiaError } from "../errors/create.ts";
import { skipExpression } from "../utils/braces.ts";
import { columnAt, lineAt } from "../utils/position.ts";
import { parseAttrs } from "./attrs.ts";
import { extractMarkers, type MarkupBlock } from "./markers.ts";
import { styleBranches, type StyleBranch } from "./style-branches.ts";

export interface Section {
  content: string;
  attrs: Record<string, string>;
  /** 1-based line where the content starts. */
  line: number;
  /** Index in the source where the content starts. */
  from: number;
  /** For a style: the IF branches around it, outermost first. Empty at the top level. */
  branches?: StyleBranch[];
}

export interface ParsedFile {
  script: Section | null;
  /** Every <style> section, in source order. */
  styles: Section[];
  markup: string;
  markupLine: number;
  fallback: MarkupBlock | null;
  /** The <head> block: its markup is rendered into the document head. */
  head: MarkupBlock | null;
  nolazy: boolean;
}

interface SectionMatch {
  kind: "script" | "style";
  rawAttrs: string | undefined;
  start: number;
  contentStart: number;
  contentEnd: number;
  end: number;
}

const SECTION_OPEN = /<(script|style)(\s[^>]*)?>/y;

// Removed sections leave their newlines behind so markup line numbers match the source.
function keepLineBreaks(text: string): string {
  return text.replace(/[^\n]/g, "");
}

function spanAt(
  source: string,
  index: number,
  file: string,
): { file: string; line: number; column: number } {
  return { file, line: lineAt(source, index), column: columnAt(source, index) };
}

function readSection(source: string, start: number, file: string): SectionMatch | null {
  SECTION_OPEN.lastIndex = start;
  const open = SECTION_OPEN.exec(source);
  if (!open) return null;
  const kind = open[1] as SectionMatch["kind"];
  const contentStart = start + open[0].length;
  const closeTag = `</${kind}>`;
  const contentEnd = source.indexOf(closeTag, contentStart);
  if (contentEnd === -1) throw lusiaError("L1001", { tag: kind }, spanAt(source, start, file));
  return {
    kind,
    rawAttrs: open[2],
    start,
    contentStart,
    contentEnd,
    end: contentEnd + closeTag.length,
  };
}

// Sections are found only in markup text: `{...}` expressions and HTML comments are skipped.
function findSections(source: string, file: string): SectionMatch[] {
  const sections: SectionMatch[] = [];
  let pos = 0;
  while (pos < source.length) {
    if (source[pos] === "{") {
      const end = skipExpression(source, pos);
      if (end === -1) break;
      pos = end;
    } else if (source.startsWith("<!--", pos)) {
      const end = source.indexOf("-->", pos);
      pos = end === -1 ? source.length : end + 3;
    } else {
      const section = source[pos] === "<" ? readSection(source, pos, file) : null;
      if (section) sections.push(section);
      pos = section ? section.end : pos + 1;
    }
  }
  return sections;
}

function toSection(source: string, section: SectionMatch): Section {
  return {
    content: source.slice(section.contentStart, section.contentEnd),
    attrs: parseAttrs(section.rawAttrs),
    line: lineAt(source, section.contentStart),
    from: section.contentStart,
  };
}

function branchesOfStyles(source: string, sections: SectionMatch[], file: string): StyleBranch[][] {
  const starts = sections
    .filter((section) => section.kind === "style")
    .map((section) => section.start);
  const skip = sections.map((section) => ({ start: section.start, end: section.end }));
  return styleBranches(source, starts, skip, file);
}

export function parse(source: string, file: string): ParsedFile {
  const result: ParsedFile = {
    script: null,
    styles: [],
    markup: "",
    markupLine: 1,
    fallback: null,
    head: null,
    nolazy: false,
  };
  let markup = "";
  let last = 0;
  const sections = findSections(source, file);
  const branches = branchesOfStyles(source, sections, file);
  for (const section of sections) {
    const { kind, start, end } = section;
    if (kind === "style") {
      result.styles.push({ ...toSection(source, section), branches: branches.shift()! });
    } else {
      if (result.script) throw lusiaError("L1002", {}, spanAt(source, start, file));
      result.script = toSection(source, section);
    }
    markup += source.slice(last, start) + keepLineBreaks(source.slice(start, end));
    last = end;
  }
  markup += source.slice(last);
  const markers = extractMarkers(markup, file);
  result.fallback = markers.fallback;
  result.head = markers.head;
  result.nolazy = markers.nolazy;
  result.markup = markers.markup.trim();
  result.markupLine = lineAt(
    markers.markup,
    markers.markup.length - markers.markup.trimStart().length,
  );
  return result;
}
