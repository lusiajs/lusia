import { findSections, type Section } from "../parse/sections.ts";
import { indentSection } from "./indent-section.ts";
import { isInsideFlowBlock } from "./flow-depth.ts";

/** The formatter for one embedded language. The editor and CLI supply Prettier. */
export interface FormatParts {
  script(code: string): Promise<string>;
  style(code: string, plainCss: boolean): Promise<string>;
  markup(markup: string): Promise<string>;
  /** Put before each line inside `<script>` and `<style>`; empty turns indenting off. */
  sectionIndent?: string;
}

/** Markup with the sections that sit inside a flow block, which must be formatted together with it. */
interface MarkupPiece {
  text: string;
  nested: Section[];
}

const PLACEHOLDER = /^([ \t]*)<lusia-section data-index="(\d+)"><\/lusia-section>[ \t]*$/gm;

/**
 * Formats a .lusia file: script as TypeScript, styles as SCSS or CSS, markup as HTML.
 * Top-level sections are blocks of their own. A section inside `<IF>`, `<EACH>` or `<FOR>`
 * stays in its markup, so the block is formatted whole.
 */
export async function formatLusia(source: string, parts: FormatParts): Promise<string> {
  const blocks: string[] = [];
  let piece: MarkupPiece = { text: "", nested: [] };
  let last = 0;
  for (const section of findSections(source)) {
    piece.text += source.slice(last, section.openStart);
    last = section.end;
    if (isInsideFlowBlock(piece.text)) {
      piece.text += placeholder(piece.nested.length);
      piece.nested.push(section);
      continue;
    }
    blocks.push(await formatMarkupPiece(source, piece, parts));
    blocks.push(await formatSectionBlock(source, section, parts));
    piece = { text: "", nested: [] };
  }
  piece.text += source.slice(last);
  blocks.push(await formatMarkupPiece(source, piece, parts));
  return blocks.filter((block) => block !== "").join("\n\n") + "\n";
}

function placeholder(index: number): string {
  return `<lusia-section data-index="${index}"></lusia-section>`;
}

async function formatMarkupPiece(
  source: string,
  piece: MarkupPiece,
  parts: FormatParts,
): Promise<string> {
  if (piece.text.trim() === "") return "";
  const markup = await parts.markup(piece.text);
  if (piece.nested.length === 0) return markup;
  const sections = await Promise.all(
    piece.nested.map((section) => formatSectionBlock(source, section, parts)),
  );
  return markup.replace(PLACEHOLDER, (_line, indent: string, index: string) =>
    indentBlock(sections[Number(index)]!, indent),
  );
}

function indentBlock(block: string, indent: string): string {
  return block
    .split("\n")
    .map((line) => (line === "" ? line : indent + line))
    .join("\n");
}

async function formatSectionBlock(
  source: string,
  section: Section,
  parts: FormatParts,
): Promise<string> {
  const content = source.slice(section.contentStart, section.contentEnd);
  const formatted = await formatSectionContent(section, content, parts);
  const code = indentSection(formatted, parts.sectionIndent ?? "");
  const open = `<${section.kind}${section.attrs.trimEnd()}>`;
  const close = `</${section.kind}>`;
  return code === "" ? `${open}${close}` : `${open}\n${code}\n${close}`;
}

function formatSectionContent(
  section: Section,
  content: string,
  parts: FormatParts,
): Promise<string> {
  if (section.kind === "script") return parts.script(content);
  return parts.style(content, /\blang\s*=\s*"css"/.test(section.attrs));
}
