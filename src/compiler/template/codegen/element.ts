import { markedCode } from "#compiler/sourcemap/marker.ts";
import { trailingArg, type GenContext } from "./context.ts";
import type { AttrBinding, AttrPart, BindBinding, EventBinding } from "../types/attribute.ts";
import type { ElementBinding } from "../types/element.ts";
import type { Expr } from "../types/expression.ts";

export function attrValue(parts: AttrPart[], ctx: GenContext): string {
  if (parts.length === 0) return "true";
  const single = parts.length === 1 ? parts[0] : undefined;
  if (typeof single === "object") return ctx.read(single);
  const pieces = parts.map((part) =>
    typeof part === "string" ? JSON.stringify(part) : `__toText(${ctx.read(part)})`,
  );
  return pieces.join(" + ");
}

const CLASS = "class";

/** A dynamic class is set whole, so it keeps the inherited tree classes the template gave the element. */
function classValue(parts: AttrPart[], ctx: GenContext): string {
  return `__withInheritedClasses(${attrValue(parts, ctx)}, __host.inherited)`;
}

function attrCall({ name, parts }: AttrBinding, ctx: GenContext): string {
  const value = name === CLASS ? classValue(parts, ctx) : attrValue(parts, ctx);
  return `__attr(__node as Element, ${JSON.stringify(name)}, () => ${value}, __cleanups);`;
}

function eventCall({ type, listen, expr }: EventBinding): string {
  const call = listen ? "__listenEvent" : "__listen";
  return `${call}(__node as Element, ${JSON.stringify(type)}, (${markedCode(expr)}), __cleanups);`;
}

function bindCall(bind: BindBinding, ctx: GenContext): string {
  const target = `(${markedCode(bind.expr)})`;
  const at = trailingArg(ctx.whereOf(bind.expr));
  if (bind.kind === "input")
    return `__bindInput(__node as HTMLElement, ${target}, __cleanups${at});`;
  if (bind.kind === "prop") {
    return `__bindProp(__node as HTMLElement, ${JSON.stringify(bind.prop)}, ${target}, __cleanups${at});`;
  }
  return `__bindElement(__node as Element, ${target}, __cleanups${at});`;
}

function animateCall(expr: Expr, ctx: GenContext): string {
  const at = ctx.whereOf(expr);
  const keys = ctx.animateKeyWheres(expr);
  const locations = keys === undefined ? trailingArg(at) : `, ${at ?? "undefined"}, ${keys}`;
  return `__animate(__node as HTMLElement, () => (${markedCode(expr)}), __cleanups, __leaves${locations});`;
}

export function elementBinder(binding: ElementBinding, ctx: GenContext): string {
  const calls = [
    ...binding.attrs.map((attr) => attrCall(attr, ctx)),
    ...binding.events.map(eventCall),
    ...binding.binds.map((bind) => bindCall(bind, ctx)),
  ];
  if (binding.animate !== undefined) calls.push(animateCall(binding.animate, ctx));
  return `(__node, __cleanups, __leaves) => {\n  ${calls.join("\n  ")}\n}`;
}
