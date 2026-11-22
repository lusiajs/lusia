import { expressionOf, formatStaticAttr, hasExpression } from "./attributes.ts";
import { bindBinding, isBindName } from "../bind.ts";
import { eventType, isEventAttr, isListenName } from "../events.ts";
import type { AttrBinding, EventBinding } from "../types/attribute.ts";
import type { Expr } from "../types/expression.ts";
import type { ElementBinding } from "../types/element.ts";

const ANIMATE = "animate";

export interface CompiledElement {
  /** Static attributes as HTML, each with a leading space. */
  statics: string;
  /** Present only when the element has something to wire at attach. */
  binding?: ElementBinding;
}

/** Splits an element's attributes into static HTML and one binding for everything dynamic. */
export function compileElement(attrs: AttrBinding[]): CompiledElement {
  const binding: ElementBinding = { kind: "element", attrs: [], events: [], binds: [] };
  let statics = "";
  for (const attr of attrs) {
    if (hasExpression(attr.parts)) addDynamic(binding, attr);
    else statics += ` ${formatStaticAttr(attr)}`;
  }
  const dynamic = binding.attrs.length + binding.events.length + binding.binds.length;
  const hasAnimate = binding.animate !== undefined;
  return dynamic > 0 || hasAnimate ? { statics, binding } : { statics };
}

function addDynamic(binding: ElementBinding, attr: AttrBinding): void {
  const expr = expressionOf(attr);
  if (attr.name === ANIMATE) binding.animate = expr;
  else if (isEventAttr(attr)) binding.events.push(eventBinding(attr.name, expr!));
  else if (isBindName(attr.name)) binding.binds.push(bindBinding(attr.name, expr!));
  else binding.attrs.push(attr);
}

function eventBinding(name: string, expr: Expr): EventBinding {
  return { type: eventType(name), listen: isListenName(name), expr };
}
