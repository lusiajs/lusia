import { planLusiaImport, type TextEdit } from "./auto-import.ts";
import {
  scriptItems,
  tagNameItems,
  propItems,
  STYLE_ATTRIBUTE_ITEMS,
  STYLE_BODY_ITEMS,
  type CompletionItemData,
  type ScriptItem,
} from "./completion-data.ts";
import { animateFieldsAt } from "./animate/animate-fields.ts";
import {
  FLOW_TAG_ITEMS,
  flowAttributeItems,
  isFlowTag,
  markupAttributeItems,
} from "./completion/markup-items.ts";
import { enumMembersAt } from "./completion/enum-members.ts";
import { propValueItems } from "./completion/declared-props.ts";
import { findComponentImport, scriptImports } from "#language/parse/imports.ts";
import { inExpressionAt } from "#language/format/format-expressions.ts";
import type { PropDef } from "#language/parse/props.ts";
import type { TextRange } from "./range.ts";
import { regionAt } from "#language/parse/regions.ts";
import { withScriptNames } from "./completion/script-names.ts";
import { scriptMemberItems } from "./completion/script-members.ts";
import type { SymbolLookup } from "./script/imported-symbols.ts";
import { scriptSection, scriptSource, type Section } from "#language/parse/sections.ts";
import { isTagNameTyping, openTagAt } from "#language/parse/tag.ts";

export { scriptMemberItems, withScriptNames };

export interface CompletionResult extends CompletionItemData {
  /** Document offsets. */
  importEdit?: TextEdit;
  /** The text the item replaces, when a language service returns one. */
  range?: TextRange;
}

export type PropLookup = (componentName: string) => PropDef[];

export function completionsAt(
  text: string,
  offset: number,
  propsOf: PropLookup,
  symbolsOf?: SymbolLookup,
): CompletionResult[] {
  const members = enumMembersAt(text, offset);
  if (members) return members.map((item) => withScriptImport(item, text));
  const script = scriptSource(text);
  const knownMembers = scriptMemberItems(script, offset, text);
  if (knownMembers) return knownMembers;
  const region = regionAt(text, offset);
  if (region.section?.kind === "script") return scriptCompletions(text, region.section, symbolsOf);
  if (region.section?.kind === "style") return STYLE_BODY_ITEMS;
  return markupCompletions(text, offset, propsOf, script, symbolsOf);
}

function scriptCompletions(
  text: string,
  section: Section,
  symbolsOf?: SymbolLookup,
): CompletionItemData[] {
  const script = text.slice(section.contentStart, section.contentEnd);
  const base = scriptItems().map((item) => withImport(item, text, section));
  return withScriptNames(base, script, symbolsOf);
}

/** Adds the import edit when the item needs one and the file has a script section. */
function withScriptImport(item: ScriptItem, text: string): CompletionResult {
  const section = scriptSection(text);
  if (!section) return item;
  return withImport(item, text, section);
}

function withImport(item: ScriptItem, text: string, section: Section): CompletionResult {
  const { importName, ...data } = item;
  const script = text.slice(section.contentStart, section.contentEnd);
  const edit = importName ? planLusiaImport(script, importName) : undefined;
  if (!edit) return data;
  return {
    ...data,
    importEdit: {
      ...edit,
      start: edit.start + section.contentStart,
      end: edit.end + section.contentStart,
    },
  };
}

function markupCompletions(
  text: string,
  offset: number,
  propsOf: PropLookup,
  script: string,
  symbolsOf?: SymbolLookup,
): CompletionItemData[] {
  if (isTagNameTyping(text, offset))
    return [...tagNameItems(scriptImports(text)), ...FLOW_TAG_ITEMS];
  const fields = animateFieldsAt(text, offset);
  if (fields) return fields.map((item) => withScriptImport(item, text));
  if (inExpressionAt(text, offset)) return withScriptNames([], script, symbolsOf);
  const tag = openTagAt(text, offset);
  if (!tag) return [];
  if (tag.name === "style") return STYLE_ATTRIBUTE_ITEMS;
  if (isFlowTag(tag.name)) return flowAttributeItems(tag.name);
  if (!findComponentImport(text, tag.name)) return markupAttributeItems(tag.name);
  const props = propsOf(tag.name);
  return propValueItems(text, offset, props) ?? propItems(props);
}
