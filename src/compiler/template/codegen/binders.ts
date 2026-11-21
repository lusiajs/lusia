import { markedCode } from "#compiler/sourcemap/marker.ts";
import { trailingArg, type GenContext } from "./context.ts";
import { attrValue, elementBinder, readExpression } from "./element.ts";
import { eachBinder, forBinder, ifBinder } from "./blocks.ts";
import type { ComponentBinding } from "../types/component.ts";
import type { HtmlBinding } from "../types/html.ts";
import type { TextBinding } from "../types/text.ts";
import type { Binding } from "../types/template.ts";

function textBinder({ expr }: TextBinding): string {
  return `(__node, __cleanups) => __bindText(__node, () => ${readExpression(expr)}, __cleanups)`;
}

/** Props are getters. A bind also reads its variable, so the prop shows the value. */
function propsObject({ props, binds }: ComponentBinding): string {
  const entries = [
    ...props.map(({ name, parts }) => `${JSON.stringify(name)}: () => ${attrValue(parts)}`),
    ...binds.map(({ prop, expr }) => `${JSON.stringify(prop)}: () => ${readExpression(expr)}`),
  ];
  return `{ ${entries.join(", ")} }`;
}

/** The variables a component can write back to. Each one is checked as writable when it is bound. */
function boundObject({ binds }: ComponentBinding, ctx: GenContext): string {
  const entries = binds.map(({ prop, attr, expr }) => {
    const at = trailingArg(ctx.whereOf(expr));
    return `${JSON.stringify(prop)}: __writableTarget((${markedCode(expr)}), ${JSON.stringify(attr)}${at})`;
  });
  return `{ ${entries.join(", ")} }`;
}

/** The children, when given, are a slot: a render in the parent's scope that the component places with CONTENT. */
function componentBinder(binding: ComponentBinding, ctx: GenContext): string {
  const { name, children } = binding;
  const slot = children === undefined ? "" : `, ${ctx.body(children, "__cleanups, __leaves")}`;
  return `(__node, __cleanups, __leaves) => __bindComponent(__node, ${name}, ${propsObject(binding)}, ${boundObject(binding, ctx)}, __cleanups, __leaves${slot})`;
}

function contentBinder(): string {
  return "(__node, __cleanups, __leaves) => __bindContent(__node, __host.content, __cleanups, __leaves)";
}

function htmlBinder({ expr }: HtmlBinding): string {
  return `(__node, __cleanups) => __bindHtml(__node, () => ${readExpression(expr)}, __cleanups)`;
}

function binderOf(binding: Binding, ctx: GenContext): string {
  switch (binding.kind) {
    case "text":
      return textBinder(binding);
    case "html":
      return htmlBinder(binding);
    case "element":
      return elementBinder(binding, ctx);
    case "component":
      return componentBinder(binding, ctx);
    case "content":
      return contentBinder();
    case "if":
      return ifBinder(binding, ctx);
    case "each":
      return eachBinder(binding, ctx);
    case "for":
      return forBinder(binding, ctx);
  }
}

/** One binder per binding, in document order, as the body of an array literal. */
export function bindersOf(bindings: Binding[], ctx: GenContext): string {
  return bindings.map((binding) => binderOf(binding, ctx)).join(",\n");
}
