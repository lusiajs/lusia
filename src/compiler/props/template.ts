import { lusiaError } from "../errors/create.ts";
import type { AttrBinding, AttrPart } from "../template/types/attribute.ts";
import type { ComponentBinding } from "../template/types/component.ts";
import type { ElementBinding } from "../template/types/element.ts";
import type { Expr } from "../template/types/expression.ts";
import type { Binding, Template } from "../template/types/template.ts";
import { rewriteProps, type PropRule } from "./rewrite.ts";

export function rewriteTemplateProps(template: Template, names: ReadonlySet<string>, file: string): void {
  if (names.size === 0) return;
  const walker = { rule: { names, target: "__props" }, file };
  walkTemplate(template, walker);
}

interface Walker {
  rule: PropRule;
  file: string;
}

function walkTemplate(template: Template, walker: Walker): void {
  for (const binding of template.bindings) walkBinding(binding, walker);
}

function walkBinding(binding: Binding, walker: Walker): void {
  switch (binding.kind) {
    case "text":
    case "html":
      rewriteExpr(binding.expr, walker);
      return;
    case "element":
      walkElement(binding, walker);
      return;
    case "component":
      walkComponent(binding, walker);
      return;
    case "if":
      for (const branch of binding.branches) {
        if (branch.test) rewriteExpr(branch.test, walker);
        walkTemplate(branch.body, walker);
      }
      return;
    case "each":
      checkLoopName(binding.item, binding.list, walker);
      checkLoopName(binding.index, binding.list, walker);
      rewriteExpr(binding.list, walker);
      if (binding.key) rewriteExpr(binding.key, walker);
      walkTemplate(binding.body, walker);
      return;
    case "for":
      checkLoopName(binding.name, binding.to, walker);
      for (const expr of [binding.from, binding.to, binding.step]) {
        if (expr) rewriteExpr(expr, walker);
      }
      walkTemplate(binding.body, walker);
      return;
    case "content":
      return;
  }
}

function walkElement(binding: ElementBinding, walker: Walker): void {
  for (const attr of binding.attrs) rewriteParts(attr.parts, walker);
  if (binding.text) rewriteParts(binding.text, walker);
  for (const event of binding.events) rewriteExpr(event.expr, walker);
  for (const bind of binding.binds) rewriteExpr(bind.expr, walker);
  if (binding.animate) rewriteExpr(binding.animate, walker);
}

function walkComponent(binding: ComponentBinding, walker: Walker): void {
  for (const attr of binding.props) rewriteParts(attr.parts, walker);
  for (const bind of binding.binds) rewriteExpr(bind.expr, walker);
  if (binding.children) walkTemplate(binding.children, walker);
}

function rewriteParts(parts: AttrPart[], walker: Walker): void {
  for (const part of parts) {
    if (typeof part !== "string") rewriteExpr(part, walker);
  }
}

function rewriteExpr(expr: Expr, { rule }: Walker): void {
  expr.code = rewriteProps(expr.code, rule);
}

function checkLoopName(name: string | undefined, at: Expr, { rule, file }: Walker): void {
  if (name === undefined || !rule.names.has(name)) return;
  throw lusiaError("L1056", { name }, { file, line: at.line, column: at.column });
}
