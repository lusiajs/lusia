import { element, type Mark, type Scope } from "./markup.ts";

function renderRow(scope: Scope, index: number): string {
  const classes = index % 2 === 0 ? ["row", "active"] : ["row"];
  const disabled = index === 2 ? " disabled" : "";
  const label = element(scope, "span", ["label"], `row ${index}`);
  const link = element(scope, "a", ["link"], "open");
  const button = element(scope, "button", ["button"], "go", { attributes: disabled });
  const note = element(scope, "div", ["muted"], element(scope, "span", ["muted", "label"], `n${index}`));
  return element(scope, "li", classes, label + link + button + note);
}

// 8 elements: div, ul, 3 li, 3 span.
export function renderChild(id: string, mark: Mark): string {
  const scope: Scope = { id, mark };
  const rows = [0, 1, 2].map((index) => element(scope, "li", ["row"], element(scope, "span", ["label"], `item ${index}`)));
  return element(scope, "div", ["child"], element(scope, "ul", ["list"], rows.join("")), { root: true });
}

// 30 elements, depth up to 6, with the child component mounted at depth 3.
export function renderParent(id: string, childId: string, mark: Mark): string {
  const scope: Scope = { id, mark };
  const rows = [0, 1, 2, 3].map((index) => renderRow(scope, index)).join("");
  const list = element(scope, "ul", ["list"], rows);
  const wrap = element(scope, "div", ["wrap"], list + renderChild(childId, mark));
  const footer = element(
    scope,
    "div",
    ["footer"],
    element(scope, "span", ["label"], "total") + element(scope, "a", ["link"], "more"),
  );
  return element(scope, "div", ["card"], wrap + footer, { root: true });
}
