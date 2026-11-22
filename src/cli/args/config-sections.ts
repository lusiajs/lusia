import { LAZY_MODES, LAZY_PREFETCH } from "#compiler/lazy/options.ts";
import {
  LINT_LEVELS,
  LINT_RULE_ALIASES,
  LINT_RULE_CODES,
  type LintLevel,
  type LintRuleCode,
  type LintRuleSettings,
} from "#language/lint/lint.ts";
import type { LusiaConfig } from "./config-types.ts";
import {
  asObject,
  checkKeys,
  configError,
  isRoute,
  oneOf,
  optionalBoolean,
  type JsonObject,
} from "./config-values.ts";

export function optionalDev(root: JsonObject): LusiaConfig["dev"] {
  if (root.dev === undefined) return undefined;
  const dev = asObject(root.dev, '"dev" must be an object');
  checkKeys(dev, ["port"], "dev");
  return { port: optionalPort(dev) };
}

function optionalPort(dev: JsonObject): number | undefined {
  if (dev.port === undefined) return undefined;
  const port = dev.port;
  if (typeof port !== "number" || !Number.isInteger(port) || port < 0 || port > 65535)
    throw configError('"dev.port" must be a whole number from 0 to 65535');
  return port;
}

export function optionalLazy(root: JsonObject): LusiaConfig["lazy"] {
  if (root.lazy === undefined) return undefined;
  const lazy = asObject(root.lazy, '"lazy" must be an object');
  checkKeys(lazy, ["mode", "prefetch"], "lazy");
  return {
    mode: oneOf(lazy.mode, LAZY_MODES, "lazy.mode"),
    prefetch: oneOf(lazy.prefetch, LAZY_PREFETCH, "lazy.prefetch"),
  };
}

export function optionalLint(root: JsonObject): LusiaConfig["lint"] {
  if (root.lint === undefined) return undefined;
  const lint = asObject(root.lint, '"lint" must be an object');
  checkKeys(lint, ["rules"], "lint");
  return { rules: optionalLintRules(lint) };
}

export function optionalFormat(root: JsonObject): LusiaConfig["format"] {
  if (root.format === undefined) return undefined;
  const format = asObject(root.format, '"format" must be an object');
  checkKeys(format, ["indentScriptAndStyle"], "format");
  return { indentScriptAndStyle: optionalBoolean(format, "indentScriptAndStyle") };
}

function optionalLintRules(lint: JsonObject): LintRuleSettings | undefined {
  if (lint.rules === undefined) return undefined;
  const rules = asObject(lint.rules, '"lint.rules" must be an object');
  const settings: LintRuleSettings = {};
  for (const [name, level] of Object.entries(rules)) {
    const code = lintRuleCode(name);
    if (code === undefined)
      throw configError(`unknown lint rule "${name}", allowed: ${LINT_RULE_CODES.join(", ")}`);
    if (!isLintLevel(level))
      throw configError(`"lint.rules.${name}" must be one of: ${LINT_LEVELS.join(", ")}`);
    settings[code] = level;
  }
  return settings;
}

function lintRuleCode(name: string): LintRuleCode | undefined {
  const alias = LINT_RULE_ALIASES[name];
  if (alias !== undefined) return alias;
  return (LINT_RULE_CODES as readonly string[]).includes(name) ? (name as LintRuleCode) : undefined;
}

function isLintLevel(level: unknown): level is LintLevel {
  return typeof level === "string" && (LINT_LEVELS as readonly string[]).includes(level);
}

export function optionalRoutes(root: JsonObject): string[] | undefined {
  if (root.routes === undefined) return undefined;
  if (!Array.isArray(root.routes)) throw configError('"routes" must be a list of paths');
  for (const route of root.routes) {
    if (typeof route !== "string" || !isRoute(route))
      throw configError(`invalid route "${String(route)}", use a path such as /guide`);
  }
  return root.routes as string[];
}
