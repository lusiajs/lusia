import { formatWhere } from "#compiler/errors/where.ts";
import { markedCode } from "#compiler/sourcemap/marker.ts";
import { lineAt, columnAt, lineStarts } from "#compiler/utils/position.ts";
import { bindersOf } from "./binders.ts";
import { unknownKeysAt } from "../check/animate-keys.ts";
import type { ScriptRange } from "../check/script-range.ts";
import type { Expr } from "../types/expression.ts";
import type { Template } from "../types/template.ts";
import type { ScopeClasses } from "../../style/scope-classes.ts";

export interface GenOptions {
  /** The path shown in runtime errors. */
  file: string;
  /** Dev builds pass each runtime check its location. */
  dev: boolean;
  /** The whole .lusia file, and where its script sits in it. Dev builds use them to find keys. */
  source: string;
  script: ScriptRange;
}

/** Module-level declarations and names for one generated module. */
export class GenContext {
  readonly declarations: string[] = [];
  private count = 0;
  private rowCount = 0;
  /** One refresh per EACH row being generated, such as `item = __row0.value`, outermost first. */
  private readonly rowRefreshes: string[] = [];
  private lines: number[] | undefined;

  constructor(
    readonly scopes: ScopeClasses,
    private readonly options: GenOptions,
  ) {}

  /** The location of an expression as a string literal, or undefined outside dev builds. */
  whereOf(expr: Expr | undefined): string | undefined {
    if (!this.options.dev || !expr) return undefined;
    return JSON.stringify(formatWhere(this.options.file, expr.line, expr.column));
  }

  /** An object literal of the dev locations of keys the runtime would reject in an animate value, or undefined. */
  animateKeyWheres(expr: Expr): string | undefined {
    if (!this.options.dev) return undefined;
    const { source, script } = this.options;
    const starts = (this.lines ??= lineStarts(source));
    const start = starts[expr.line - 1]! + expr.column - 1;
    const unknown = unknownKeysAt(source, start, script);
    if (unknown.length === 0) return undefined;
    const entries = unknown.map(({ key, offset }) => {
      const where = formatWhere(
        this.options.file,
        lineAt(source, offset),
        columnAt(source, offset),
      );
      return `${JSON.stringify(key)}: ${JSON.stringify(where)}`;
    });
    return `{ ${entries.join(", ")} }`;
  }

  /** Declares a lazily parsed template for `html` and returns its name. */
  template(html: string): string {
    const name = `__tpl${this.count++}`;
    this.declarations.push(`const ${name} = __lazyTemplate(${JSON.stringify(html)});`);
    return name;
  }

  /** Expression that clones one template and runs its binders. Needs `__host`, `__cleanups` and `__leaves` in scope. */
  fragment(template: Template): string {
    const name = this.template(template.html);
    return `__instantiate(${name}(), __host.inherited, [\n${bindersOf(template.bindings, this)}\n], __cleanups, __leaves)`;
  }

  /** A render function for a block body. `params` is the parameter list, ending with the cleanups and leaves. */
  body(template: Template, params: string): string {
    return `(${params}) => ${this.fragment(template)}`;
  }

  /** A watched read of a markup expression. Inside EACH rows it first refreshes each row item, so it follows item updates. */
  read(expr: Expr): string {
    const code = markedCode(expr);
    if (this.rowRefreshes.length === 0) return `__unwrap((${code}))`;
    return `__unwrap((${this.rowRefreshes.join(", ")}, (${code})))`;
  }

  /** An EACH row render. The item arrives as a variable; `item` is a local the row's expressions and handlers read. */
  rowBody(template: Template, item: string, index: string): string {
    const row = `__row${this.rowCount++}`;
    this.rowRefreshes.push(`${item} = ${row}.value`);
    const fragment = this.fragment(template);
    this.rowRefreshes.pop();
    return `(${row}, ${index}, __cleanups, __leaves) => {
  let ${item} = ${row}.peek();
  __cleanups.push(__followItem(${row}, (value) => { ${item} = value; }));
  return ${fragment};
}`;
  }
}

/** `, arg` when there is a location argument, otherwise nothing. */
export function trailingArg(arg: string | undefined): string {
  return arg === undefined ? "" : `, ${arg}`;
}
