import { ELEMENT_MARKER, TEXT_MARKER } from "../../markers.ts";
import type { Binder, Cleanup } from "./bindings.ts";
import { addClasses } from "./classes.ts";
import type { Leave } from "../component/leave.ts";

export interface CompiledTemplate {
  /** The markup as parsed, with no inherited classes. */
  content: DocumentFragment;
  /** Child-index path from the fragment root to each binding marker, in document order. */
  paths: number[][];
  /** One copy of `content` per inherited class list, with those classes on every element. */
  variants: Map<string, DocumentFragment>;
}

function isMarker(node: Node): boolean {
  if (node.nodeType === Node.COMMENT_NODE) return (node as Comment).data === TEXT_MARKER;
  return node.nodeType === Node.ELEMENT_NODE && (node as Element).hasAttribute(ELEMENT_MARKER);
}

function collectPaths(parent: Node, path: number[], paths: number[][]): void {
  parent.childNodes.forEach((child, index) => {
    const childPath = [...path, index];
    if (isMarker(child)) paths.push(childPath);
    if (child.nodeType !== Node.ELEMENT_NODE) return;
    const el = child as Element;
    el.removeAttribute(ELEMENT_MARKER);
    collectPaths(el, childPath, paths);
  });
}

export function createTemplate(html: string): CompiledTemplate {
  const template = document.createElement("template");
  template.innerHTML = html;
  const paths: number[][] = [];
  collectPaths(template.content, [], paths);
  return { content: template.content, paths, variants: new Map() };
}

function variantOf(compiled: CompiledTemplate, inherited: string): DocumentFragment {
  let variant = compiled.variants.get(inherited);
  if (!variant) {
    variant = compiled.content.cloneNode(true) as DocumentFragment;
    addClasses(variant, inherited);
    compiled.variants.set(inherited, variant);
  }
  return variant;
}

function resolvePath(root: Node, path: number[]): Node {
  let node = root;
  for (const index of path) node = node.childNodes[index]!;
  return node;
}

export function instantiate(
  compiled: CompiledTemplate,
  inherited: string,
  binders: Binder[],
  cleanups: Cleanup[],
  leaves: Leave[],
): DocumentFragment {
  const source = inherited === "" ? compiled.content : variantOf(compiled, inherited);
  const fragment = source.cloneNode(true) as DocumentFragment;
  const nodes = compiled.paths.map((path) => resolvePath(fragment, path));
  nodes.forEach((node, index) => binders[index]!(node, cleanups, leaves));
  return fragment;
}

export function lazyTemplate(html: string): () => CompiledTemplate {
  let compiled: CompiledTemplate | undefined;
  return () => (compiled ??= createTemplate(html));
}
