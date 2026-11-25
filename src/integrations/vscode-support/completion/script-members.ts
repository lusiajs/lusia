import type { CompletionItemData } from "../completion-data.ts";
import { receiverAt, variableKinds } from "./locals.ts";
import { memberItems, namespaceMemberItems } from "./members.ts";
import { declaredPropItems } from "./declared-props.ts";
import { findPropsCall, parsePropDefs } from "#language/parse/props.ts";

/** `text` holds the receiver, `script` holds its declaration. */
export function scriptMemberItems(
  script: string,
  offset: number,
  text = script,
): CompletionItemData[] | undefined {
  const receiver = receiverAt(text, offset);
  if (receiver === undefined) return undefined;
  if (receiver === "variable") return namespaceMemberItems("variable");
  if (receiver === propsHolderName(script)) return declaredPropItems(parsePropDefs(text));
  const kind = variableKinds(script).get(receiver);
  return kind ? memberItems(kind) : undefined;
}

/** The name of `const p = props(class {...})`, or undefined for the destructured form. */
function propsHolderName(script: string): string | undefined {
  const call = findPropsCall(script);
  return call?.binding.kind === "object" ? call.binding.name : undefined;
}
