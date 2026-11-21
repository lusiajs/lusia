import { markupClasses } from "#compiler/style/markup.ts";
import type { LintFinding, LintRule } from "../types.ts";

export const untypedClass: LintRule = (context) =>
  markupClasses(context.source, context.resolveClassType).wide.map(
    ({ name, offset, type }): LintFinding => ({
      offset,
      code: "untyped-class",
      message: `Can't tell which classes "${name}" adds. Its type is ${type}, so it could be any class. Type it as a union, e.g. "odd" | "even", or add // @on-purpose.`,
      severity: "warning",
    }),
  );
