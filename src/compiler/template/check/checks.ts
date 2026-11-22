import { checkAnimateAttribute } from "../animate.ts";
import { expressionOf, hasExpression, type AttrCheck, type Fail } from "../scan/attributes.ts";
import { BIND_NAME, FORM_TAGS, isBindName } from "../bind.ts";
import { isEventName, isListenName } from "../events.ts";
import type { AttrBinding } from "../types/attribute.ts";

export type AttrKind = "expression" | "identifier";

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

function checkBind(tag: string, attr: AttrBinding, fail: Fail): void {
  if (!BIND_NAME.test(attr.name)) fail("L1014");
  if (expressionOf(attr) === undefined) fail("L1015", { attr: attr.name });
  if (attr.name === "bind-value" && !FORM_TAGS.has(tag)) fail("L1024");
}

/** Elements: `bind-value`, `animate` and dynamic events each need exactly one {expression}. */
export function elementCheck(tag: string): AttrCheck {
  return (attr, previous, fail) => {
    checkAnimateAttribute(attr, previous, fail);
    if (isBindName(attr.name)) checkBind(tag, attr, fail);
    else if (
      isEventName(attr.name) &&
      hasExpression(attr.parts) &&
      expressionOf(attr) === undefined
    ) {
      fail("L1016", { attr: attr.name });
    }
  };
}

/** Components pass `onX={fn}` as a prop, and `bind-<prop>={variable}` two ways. `bind-element` is for elements. */
export const componentCheck: AttrCheck = (attr, _previous, fail) => {
  if (isListenName(attr.name)) fail("L1045", { attr: attr.name });
  if (!isBindName(attr.name)) return;
  if (!BIND_NAME.test(attr.name)) fail("L1014");
  if (expressionOf(attr) === undefined) fail("L1015", { attr: attr.name });
  if (attr.name === "bind-element") fail("L1023");
};

/** Control-flow tags accept only the attributes in `kinds`, each in the form its kind names. */
export function blockCheck(tag: string, kinds: ReadonlyMap<string, AttrKind>): AttrCheck {
  return (attr, previous, fail) => {
    const kind = kinds.get(attr.name);
    if (!kind) failUnknownAttr(tag, attr.name, kinds.size === 0, fail);
    if (previous.some((other) => other.name === attr.name)) fail("L1021", { attr: attr.name });
    if (kind === "identifier") checkIdentifier(attr, fail);
    else if (expressionOf(attr) === undefined) fail("L1022", { attr: attr.name });
  };
}

function failUnknownAttr(tag: string, attr: string, takesNone: boolean, fail: Fail): never {
  if (takesNone) fail("L1019", { tag });
  fail("L1020", { tag, attr });
}

function checkIdentifier(attr: AttrBinding, fail: Fail): void {
  const expr = expressionOf(attr);
  if (expr === undefined || !IDENTIFIER.test(expr.code)) fail("L1025", { attr: attr.name });
}
