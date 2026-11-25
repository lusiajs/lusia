import { apiKey, findApiById, importableApi } from "../api-lookup.ts";
import type { CompletionItemData, CompletionKind } from "../completion-data.ts";

export type VariableKind = "variable" | "computed";

const NAMESPACE_ROOT = "variable";

/** The members of a variable or a computed variable, described from reference/api.ts. */
export function memberItems(kind: VariableKind): CompletionItemData[] {
  const type = findApiById(kind === "computed" ? "computed-variable-type" : "variable-type");
  const bullets = type?.bullets ?? [];
  const items = [
    member("value", "property", "value", false, bullets[0]),
    member("get", "function", "get()", false, bullets[0]),
  ];
  if (kind !== "computed") items.push(member("set", "function", "set($0)", true, bullets[0]));
  items.push(member("peek", "function", "peek()", false, bullets[1]));
  if (kind === "variable") {
    const onUpdate = findApiById("variable-instance-on-update");
    items.push(
      member("onUpdate", "function", "onUpdate($0)", true, onUpdate?.signature, onUpdate?.id),
    );
  }
  return items;
}

/** The lusia members under a namespace such as `variable.`: compute, autoRun and watch. */
export function namespaceMemberItems(root: string): CompletionItemData[] {
  if (root !== NAMESPACE_ROOT) return [];
  const prefix = `${NAMESPACE_ROOT}.`;
  return importableApi()
    .filter((entry) => apiKey(entry).startsWith(prefix))
    .map((entry) => {
      const label = apiKey(entry).slice(prefix.length);
      return {
        label,
        kind: "function" as CompletionKind,
        insertText: label,
        snippet: false,
        detail: entry.signature,
        entryId: entry.id,
      };
    });
}

function member(
  label: string,
  kind: CompletionKind,
  insertText: string,
  snippet: boolean,
  detail: string | undefined,
  entryId?: string,
): CompletionItemData {
  const item: CompletionItemData = { label, kind, insertText, snippet };
  if (detail !== undefined) item.detail = detail;
  if (entryId !== undefined) item.entryId = entryId;
  return item;
}
