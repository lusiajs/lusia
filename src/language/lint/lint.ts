import type { PropDef } from "../parse/props.ts";
import { buildContext } from "./context.ts";
import { isLintDisabled, parseLintDirectives, type LintDirective } from "./comments.ts";
import { lintLevel, severityOf } from "./options.ts";
import { animateAttributes } from "./rules/animate-attributes.ts";
import { animateKeys } from "./rules/animate-keys.ts";
import { bindTargets } from "./rules/bind-targets.ts";
import { emptyExpression } from "./rules/empty-expression.ts";
import { flowChain } from "./rules/flow-chain.ts";
import { propsTwice } from "./rules/props-twice.ts";
import { scrollLines } from "./rules/scroll-lines.ts";
import { styleAttribute } from "./rules/style-attribute.ts";
import { unknownProp } from "./rules/unknown-prop.ts";
import { unusedClass } from "./rules/unused-class.ts";
import { unusedImport } from "./rules/unused-import.ts";
import { untypedClass } from "./rules/untyped-class.ts";
import type { ChildSourceLookup, LintFinding, LintIssue, LintOptions, LintRule } from "./types.ts";

export { LINT_LEVELS, LINT_RULE_ALIASES, LINT_RULE_CODES } from "./types.ts";
export type {
  ChildSource,
  ChildSourceLookup,
  LintFix,
  LintIssue,
  LintLevel,
  LintOptions,
  LintRuleCode,
  LintRuleSettings,
  Severity,
} from "./types.ts";

const RULES: LintRule[] = [
  unusedImport,
  propsTwice,
  unknownProp,
  emptyExpression,
  styleAttribute,
  animateAttributes,
  animateKeys,
  scrollLines,
  flowChain,
  bindTargets,
  unusedClass,
  untypedClass,
];

/** `childProps` gives the props of an imported component, `childSource` its source. */
export function lintLusia(
  source: string,
  childProps: (name: string) => PropDef[] | undefined,
  options: LintOptions = {},
  childSource: ChildSourceLookup = () => undefined,
): LintIssue[] {
  const context = buildContext(source, options, childProps, childSource);
  const directives = options.disableComments === false ? [] : parseLintDirectives(source);
  return RULES.flatMap((rule) => rule(context))
    .sort((a, b) => a.offset - b.offset)
    .flatMap((finding) => {
      const issue = toIssue(source, finding, options, directives);
      return issue ? [issue] : [];
    });
}

function toIssue(
  source: string,
  finding: LintFinding,
  options: LintOptions,
  directives: LintDirective[],
): LintIssue | undefined {
  const level = lintLevel(finding.code, finding.severity, options.rules);
  if (level === "off") return undefined;
  const { line, column } = positionOf(source, finding.offset);
  if (isLintDisabled(directives, line, finding.code)) return undefined;
  const issue: LintIssue = {
    line,
    column,
    message: finding.message,
    severity: severityOf(level),
    code: finding.code,
  };
  return finding.fix ? { ...issue, fix: finding.fix } : issue;
}

function positionOf(source: string, offset: number): { line: number; column: number } {
  const before = source.slice(0, offset);
  return { line: before.split("\n").length, column: offset - before.lastIndexOf("\n") };
}
