import type { Expr } from "./expression.ts";

export type AttrPart = string | Expr;

export interface AttrBinding {
  name: string;
  parts: AttrPart[];
}

export interface EventBinding {
  type: string;
  listen: boolean;
  expr: Expr;
}

/** `bind-value={sig}` picks the property by element type; the other two name it explicitly. */
export type BindBinding =
  | { kind: "input"; expr: Expr }
  | { kind: "prop"; prop: string; expr: Expr }
  | { kind: "element"; expr: Expr };
