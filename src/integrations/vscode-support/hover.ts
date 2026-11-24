import type { ApiEntry } from "../../reference/api.ts";
import type { PropLookup } from "./completions.ts";
import { inExpressionAt } from "#language/format/format-expressions.ts";
import { markupHover } from "./hover/markup.ts";
import { scriptHover } from "./hover/script.ts";
import { styleHover } from "./hover/style.ts";
import type { PropDef } from "#language/parse/props.ts";
import type { TextRange } from "./range.ts";
import { regionAt } from "#language/parse/regions.ts";
import type { ScriptSymbol } from "./script/symbols.ts";
import type { SymbolLookup } from "./script/imported-symbols.ts";

export type HoverResult = (
  | { kind: "api"; entry: ApiEntry }
  | { kind: "component"; name: string; props: PropDef[] }
  | { kind: "css"; name: string }
  | { kind: "symbol"; symbol: ScriptSymbol; local: string }
  | { kind: "markdown"; markdown: string }
) & {
  /** The document span the hover covers, when it is wider than the word under the cursor. */
  range?: TextRange;
};

export { scriptHover };

export function hoverAt(
  text: string,
  offset: number,
  propsOf: PropLookup,
  symbolsOf?: SymbolLookup,
): HoverResult | undefined {
  const region = regionAt(text, offset);
  if (region.section?.kind === "script") return scriptHover(text, offset, symbolsOf);
  if (region.section?.kind === "style") return styleHover(text, offset);
  if (inExpressionAt(text, offset))
    return scriptHover(text, offset, symbolsOf) ?? markupHover(text, offset, propsOf);
  return markupHover(text, offset, propsOf);
}
