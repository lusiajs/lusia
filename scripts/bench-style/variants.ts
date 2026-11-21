import { scopeCss } from "../../src/compiler/style/modes.ts";
import { renderRules, type Rule } from "./rules.ts";
import { markSelectorList } from "./mark-subject.ts";
import { NO_MARK, type Mark } from "./markup.ts";

export interface Variant {
  name: string;
  note: string;
  styleFor: (id: string, rules: readonly Rule[]) => string;
  mark: Mark;
}

const markRootOnly: Mark = (id, isRoot) =>
  isRoot ? { attributes: ` data-l="${id}"`, classes: [] } : NO_MARK;

const markEveryElement: Mark = (id) => ({ attributes: ` data-l="${id}"`, classes: [] });

const markClass: Mark = (id) => ({ attributes: "", classes: [`s-${id}`] });

export const VARIANTS: readonly Variant[] = [
  {
    name: "lusia-tree (default)",
    note: "Real compiler, tree mode; data-l on component roots only",
    styleFor: (id, rules) => scopeCss(renderRules(rules), id, "tree"),
    mark: markRootOnly,
  },
  {
    name: "lusia-scoped",
    note: "Real compiler, scoped mode; data-l on component roots only",
    styleFor: (id, rules) => scopeCss(renderRules(rules), id, "scoped"),
    mark: markRootOnly,
  },
  {
    name: "mark-all-attr",
    note: "Vue style: data-l on every element, subject compound gets [data-l]",
    styleFor: (id, rules) =>
      renderRules(rules, (selector) => markSelectorList(selector, `[data-l="${id}"]`)),
    mark: markEveryElement,
  },
  {
    name: "class-marker",
    note: "Svelte style: every element has class s-<id>, subject gets .s-<id>",
    styleFor: (id, rules) => renderRules(rules, (selector) => markSelectorList(selector, `.s-${id}`)),
    mark: markClass,
  },
  {
    name: "class-where",
    note: "Zero specificity: every element has class s-<id>, subject gets :where(.s-<id>)",
    styleFor: (id, rules) =>
      renderRules(rules, (selector) => markSelectorList(selector, `:where(.s-${id})`)),
    mark: markClass,
  },
  {
    name: "unscoped",
    note: "Plain rules, no scoping (lower bound)",
    styleFor: (_id, rules) => renderRules(rules),
    mark: () => NO_MARK,
  },
];
