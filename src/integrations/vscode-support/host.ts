declare const __LUSIA_VERSION__: string;

export const EDITOR_API_VERSION = 1;
export const LUSIA_VERSION = __LUSIA_VERSION__;

export * as range from "./range.ts";
export * as completions from "./completions.ts";
export * as completionData from "./completion-data.ts";
export * as markupItems from "./completion/markup-items.ts";
export * as hover from "./hover.ts";
export * as markdown from "./markdown.ts";
export * as apiLookup from "./api-lookup.ts";
export * as autoImport from "./auto-import.ts";
export * as errorPosition from "./error-position.ts";
export * as semanticTokens from "./semantic-tokens.ts";
export * as scriptSymbols from "./script/symbols.ts";
export * as format from "../language/format/format.ts";
export * as formatExpressions from "../language/format/format-expressions.ts";
export * as indentSetting from "../language/format/indent-setting.ts";
export * as prettierParts from "../language/format/prettier-parts.ts";
export * as lint from "../language/lint/lint.ts";
export * as parseImports from "../language/parse/imports.ts";
export * as parseProps from "../language/parse/props.ts";
export * as parseRegions from "../language/parse/regions.ts";
export * as parseSections from "../language/parse/sections.ts";
export * as parseTag from "../language/parse/tag.ts";
export * as compiler from "../compiler/index.ts";
export * as api from "../../reference/api.ts";
export * as runtime from "../runtime/index.ts";
