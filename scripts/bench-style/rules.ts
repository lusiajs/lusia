export interface Rule {
  selector: string;
  body: string;
}

export type SelectorRewrite = (selector: string) => string;

const keepSelector: SelectorRewrite = (selector) => selector;

export function renderRules(rules: readonly Rule[], rewrite: SelectorRewrite = keepSelector): string {
  return rules.map((rule) => `${rewrite(rule.selector)} { ${rule.body} }`).join("\n");
}

export const PARENT_RULES: readonly Rule[] = [
  { selector: ".card", body: "color: #222; background-color: #fff; padding: 4px" },
  { selector: ".card .label", body: "color: #333" },
  { selector: ".card > .row", body: "border-color: #ccc" },
  { selector: ".card *", body: "border-color: #eee" },
  { selector: ".card .muted", body: "color: #888" },
  { selector: ".card .link:hover", body: "color: #00f" },
  { selector: ".row", body: "margin: 2px" },
  { selector: ".row.active", body: "background-color: #eef" },
  { selector: "li.row", body: "padding: 2px" },
  { selector: "li.row.active", body: "border-color: #99f" },
  { selector: ".row:nth-child(odd)", body: "background-color: #fafafa" },
  { selector: ".row:nth-child(even)", body: "background-color: #fff" },
  { selector: ".row:hover", body: "background-color: #f5f5f5" },
  { selector: ".row > .label", body: "opacity: 0.9" },
  { selector: ".row + .row", body: "margin-top: 0" },
  { selector: ".label", body: "color: #333" },
  { selector: ".label.muted", body: "color: #999" },
  { selector: "span.label", body: "opacity: 1" },
  { selector: ".link", body: "color: #06c" },
  { selector: ".link:hover", body: "color: #00f" },
  { selector: ".link:focus", body: "border-color: #06c" },
  { selector: "a.link.active", body: "color: #c00" },
  { selector: ".link[disabled]", body: "opacity: 0.5" },
  { selector: ".button", body: "padding: 2px 6px" },
  { selector: ".button.active", body: "background-color: #ddf" },
  { selector: "button.button:hover", body: "background-color: #eee" },
  { selector: ".button:disabled", body: "opacity: 0.5" },
  { selector: "[disabled]", body: "opacity: 0.5" },
  { selector: "[disabled].button", body: "border-color: #ddd" },
  { selector: ".muted", body: "color: #888" },
  { selector: ".wrap", body: "margin: 0" },
  { selector: ".wrap > .list", body: "padding: 0" },
  { selector: ".list", body: "margin: 0" },
  { selector: ".list li", body: "margin: 0" },
  { selector: ".list > li.row:last-child", body: "border-color: #aaa" },
  { selector: ".footer", body: "padding: 4px; border-color: #ccc" },
  { selector: ".footer > .label", body: "color: #555" },
  { selector: ".footer .link", body: "color: #555" },
  { selector: ".child", body: "margin: 2px" },
  { selector: ".child .row", body: "background-color: #fdfdfd" },
];

export const CHILD_RULES: readonly Rule[] = PARENT_RULES.slice(0, 12);
