import { markedCode } from "#compiler/sourcemap/marker.ts";
import { trailingArg, type GenContext } from "./context.ts";
import { readExpression } from "./element.ts";
import type { EachBinding } from "../types/each.ts";
import type { Expr } from "../types/expression.ts";
import type { ForBinding } from "../types/for.ts";
import type { IfBinding } from "../types/if.ts";

const DEFAULT_ITEM = "__item";
const DEFAULT_INDEX = "__index";

function branchLiteral(test: Expr | undefined, render: string): string {
  if (test === undefined) return `{ render: ${render} }`;
  return `{ test: () => ${readExpression(test)}, render: ${render} }`;
}

export function ifBinder(binding: IfBinding, ctx: GenContext): string {
  const branches = binding.branches.map((branch) =>
    branchLiteral(branch.test, ctx.body(branch.body, "__cleanups, __leaves")),
  );
  return `(__node, __cleanups, __leaves) => __bindIf(__node, [\n  ${branches.join(",\n  ")}\n], __cleanups, __leaves)`;
}

export function eachBinder(binding: EachBinding, ctx: GenContext): string {
  const item = binding.item ?? DEFAULT_ITEM;
  const index = binding.index ?? DEFAULT_INDEX;
  const render = ctx.body(binding.body, `${item}, ${index}, __cleanups, __leaves`);
  const key =
    binding.key === undefined ? "" : `key: (${item}, ${index}) => (${markedCode(binding.key)}), `;
  const where = ctx.whereOf(binding.key ?? binding.list);
  const whereField = where === undefined ? "" : `where: ${where}, `;
  const indexed = binding.index !== undefined;
  return `(__node, __cleanups, __leaves) => __bindEach(__node, {\n  read: () => ${readExpression(binding.list)},\n  render: ${render},\n  ${key}${whereField}indexed: ${indexed},\n}, __cleanups, __leaves)`;
}

function boundOf(expr: Expr | undefined, fallback: string): string {
  return expr === undefined ? fallback : readExpression(expr);
}

export function forBinder(binding: ForBinding, ctx: GenContext): string {
  const render = ctx.body(binding.body, `${binding.name}, ${DEFAULT_INDEX}, __cleanups, __leaves`);
  const bounds = [
    `from: ${boundOf(binding.from, "0")}`,
    `to: ${readExpression(binding.to)}`,
    `step: ${boundOf(binding.step, "1")}`,
  ];
  const at = trailingArg(ctx.whereOf(binding.step ?? binding.to));
  return `(__node, __cleanups, __leaves) => __bindFor(__node, () => ({ ${bounds.join(", ")} }), ${render}, __cleanups, __leaves${at})`;
}
