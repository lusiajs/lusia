import type { ClassTypeResolver } from "#compiler/style/markup.ts";
import type { PropDef } from "../parse/props.ts";

export const LINT_RULE_CODES = [
  "unused-import",
  "props-twice",
  "unknown-prop",
  "empty-expression",
  "style-attribute",
  "animate-keyframes",
  "animate-key",
  "scroll-old-form",
  "flow-chain",
  "bind-target",
  "unused-class",
  "untyped-class",
] as const;

export type LintRuleCode = (typeof LINT_RULE_CODES)[number];

/** Old rule names that still work in config. They map to the new name. */
export const LINT_RULE_ALIASES: Partial<Record<string, LintRuleCode>> = {
  "scroll-numeric-line": "scroll-old-form",
};

export const LINT_LEVELS = ["off", "warn", "error"] as const;

export type LintLevel = (typeof LINT_LEVELS)[number];

/** The configured level of each rule. A rule that is left out keeps its own severity. */
export type LintRuleSettings = Partial<Record<LintRuleCode, LintLevel>>;

export interface LintOptions {
  rules?: LintRuleSettings;
  /** Read `<!-- lusia-lint-disable ... -->` comments. Default true. */
  disableComments?: boolean;
  /** The file the source is from. Sass loads relative imports from its folder. */
  file?: string;
  /** Reads the value type of a name the script does not declare. */
  resolveClassType?: ClassTypeResolver;
}

/** An imported component: its file, its source, and the lookup for its own imports. */
export interface ChildSource {
  path: string;
  source: string;
  childSource: ChildSourceLookup;
  /** Reads class types from the child's own imports. */
  resolveClassType: ClassTypeResolver | undefined;
}

export type ChildSourceLookup = (name: string) => ChildSource | undefined;

export type Severity = "warning" | "error";

/** Offsets are absolute, into the whole source. */
export interface LintFix {
  start: number;
  end: number;
  text: string;
}

export interface LintFinding {
  offset: number;
  code: LintRuleCode;
  message: string;
  severity: Severity;
  fix?: LintFix;
}

/** What the editor and the CLI show. `line` and `column` are 1-based. */
export interface LintIssue {
  line: number;
  column: number;
  message: string;
  severity: Severity;
  code: LintRuleCode;
  fix?: LintFix;
}

export interface LintContext {
  source: string;
  script: string;
  scriptOffset: number;
  /** The source with script and style content blanked, so offsets still match. */
  markup: string;
  file: string | undefined;
  resolveClassType: ClassTypeResolver | undefined;
  childProps(name: string): PropDef[] | undefined;
  childSource: ChildSourceLookup;
}

export type LintRule = (context: LintContext) => LintFinding[];
