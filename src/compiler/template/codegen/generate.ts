import { hotVariables } from "#compiler/hot/variables.ts";
import { markLines } from "#compiler/sourcemap/marker.ts";
import { GenContext, type GenOptions } from "./context.ts";
import type { Template } from "../types/template.ts";
import type { ScopeClasses } from "../../style/scope-classes.ts";

/** Set when the file has <NO_SSR />. `fallbackSpecifier` is the file's own `?fallback` import, when it has a <FALLBACK>. */
export interface NoSsrParts {
  fallbackSpecifier?: string;
}

export interface ComponentParts extends GenOptions {
  imports: string;
  body: string;
  /** The .lusia line where `body` starts. */
  bodyLine: number;
  template: Template;
  /** The <head> block. Its nodes are placed in the document head while the component is. */
  head?: Template;
  noSsr?: NoSsrParts;
  css: string;
  id: string;
  scopes: ScopeClasses;
  propsHolder?: string;
}

const RUNTIME_IMPORT = `import {
  animate as __animate,
  attr as __attr,
  bindComponent as __bindComponent,
  bindContent as __bindContent,
  joinClasses as __joinClasses,
  withInheritedClasses as __withInheritedClasses,
  bindEach as __bindEach,
  bindElement as __bindElement,
  bindFor as __bindFor,
  followItem as __followItem,
  bindHtml as __bindHtml,
  bindIf as __bindIf,
  bindInput as __bindInput,
  bindProp as __bindProp,
  bindText as __bindText,
  bindTextContent as __bindTextContent,
  propTarget as __propTarget,
  defineComponent as __defineComponent,
  instantiate as __instantiate,
  lazyComponent as __lazyComponent,
  lazyTemplate as __lazyTemplate,
  bindEvent as __listen,
  bindListen as __listenEvent,
  toText as __toText,
  unwrap as __unwrap,
  writableTarget as __writableTarget,
  type Cleanup as __Cleanup,
  type Host as __Host,
  type Leave as __Leave,
} from "lusiajs/internal";`;

// Dev builds only: the hot registry that lets `lusia dev` swap a component in place.
const HOT_IMPORT = `import {
  hotComponent as __hotComponent,
  hotVariable as __hotVariable,
} from "lusiajs/internal";`;

function renderFunction(body: string, bodyLine: number, fragment: string, head?: string): string {
  const lines = [
    "function __render(__cleanups: __Cleanup[], __leaves: __Leave[], __host: __Host): DocumentFragment {",
    markLines(body, bodyLine),
  ];
  if (head) lines.push(`  __host.head = ${head};`);
  lines.push(`  return ${fragment};`, "}");
  return lines.join("\n");
}

// The head is built by __render, in the same script scope; this hands it to the runtime.
const RENDER_HEAD = `function __renderHead(__cleanups: __Cleanup[], __leaves: __Leave[], __host: __Host): DocumentFragment {
  return __host.head!;
}`;

/** The generated module, with position markers that `extractSourceMap` removes. */
export function generate({
  imports,
  body,
  bodyLine,
  template,
  head,
  noSsr,
  css,
  id,
  scopes,
  file,
  dev,
  source,
  script,
  propsHolder,
}: ComponentParts): string {
  const ctx = new GenContext(scopes, { file, dev, source, script, propsHolder });
  const fragment = ctx.fragment(template);
  const headFragment = head ? ctx.fragment(head) : undefined;
  return [
    imports,
    ...fallbackImport(noSsr),
    RUNTIME_IMPORT,
    ...(dev ? [HOT_IMPORT] : []),
    `const __css = ${JSON.stringify(css)};`,
    ...ctx.declarations,
    renderFunction(dev ? hotVariables(body) : body, bodyLine, fragment, headFragment),
    ...(head ? [RENDER_HEAD] : []),
    exportLine(id, dev, head !== undefined, noSsr),
  ].join("\n");
}

function fallbackImport(noSsr: NoSsrParts | undefined): string[] {
  if (!noSsr?.fallbackSpecifier) return [];
  return [`import __Fallback from ${JSON.stringify(noSsr.fallbackSpecifier)};`];
}

function optionsOf(hasHead: boolean, noSsr: NoSsrParts | undefined): string {
  const entries = [
    ...(hasHead ? ["head: __renderHead"] : []),
    ...(noSsr ? ["noSsr: true"] : []),
    ...(noSsr?.fallbackSpecifier ? ["fallback: __Fallback"] : []),
  ];
  return entries.length > 0 ? `, { ${entries.join(", ")} }` : "";
}

function exportLine(
  id: string,
  dev: boolean,
  hasHead: boolean,
  noSsr: NoSsrParts | undefined,
): string {
  const define = dev ? "__hotComponent" : "__defineComponent";
  return `export default ${define}(${JSON.stringify(id)}, __css, __render${optionsOf(hasHead, noSsr)});`;
}
