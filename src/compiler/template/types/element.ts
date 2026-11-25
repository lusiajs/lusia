import type { AttrBinding, AttrPart, BindBinding, EventBinding } from "./attribute.ts";
import type { Expr } from "./expression.ts";

export interface ElementBinding {
  kind: "element";
  attrs: AttrBinding[];
  events: EventBinding[];
  binds: BindBinding[];
  animate?: Expr;
  /** The whole text of a title or textarea, when it has an expression. */
  text?: AttrPart[];
}
