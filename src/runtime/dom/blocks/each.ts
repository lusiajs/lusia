import { untrack, watch } from "../../variable/graph.ts";
import { keepScope } from "../../config/scope.ts";
import { variable, type Variable } from "../../variable/variable.ts";
import { runtimeError, withWhere } from "../../errors.ts";
import type { Cleanup } from "../template/bindings.ts";
import type { Leave } from "../component/leave.ts";
import { mountBefore, moveBefore, type Mount } from "./mount.ts";
import { Outlet } from "./outlet.ts";

export type RowRender = (
  item: Variable<unknown>,
  index: Variable<number> | undefined,
  cleanups: Cleanup[],
  leaves: Leave[],
) => DocumentFragment;

export interface EachSpec {
  read: () => unknown;
  render: RowRender;
  /** Defaults to the item itself. The key sees the index as a number. */
  key?: (item: unknown, index: number) => unknown;
  indexed: boolean;
  where?: string;
}

interface Row extends Mount {
  item: Variable<unknown>;
  key: unknown;
  index: Variable<number> | undefined;
}

function listOf(value: unknown): readonly unknown[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : Array.from(value as Iterable<unknown>);
}

/** Keyed rows between a marker and the nodes that follow it. A row with the same key is kept: it moves and takes the new item. */
class EachBlock {
  private rows: Row[] = [];
  private readonly outlet: Outlet;

  constructor(
    private readonly marker: Comment,
    private readonly spec: EachSpec,
    leaves: Leave[],
  ) {
    this.outlet = new Outlet(leaves);
  }

  update(items: readonly unknown[]): void {
    untrack(() => withWhere(this.spec.where, () => this.reconcile(items)));
  }

  dispose(): void {
    this.outlet.disposeAll();
  }

  private keyOf(item: unknown, index: number): unknown {
    return this.spec.key ? this.spec.key(item, index) : item;
  }

  private reconcile(items: readonly unknown[]): void {
    const reusable = new Map<unknown, Row>();
    for (const row of this.rows) reusable.set(row.key, row);
    const seen = new Set<unknown>();
    const keys: unknown[] = new Array(items.length);
    const plan: (Row | undefined)[] = new Array(items.length);
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const key = this.keyOf(item, i);
      if (seen.has(key)) throw runtimeError("L2041", { key: String(key) });
      seen.add(key);
      keys[i] = key;
      const row = reusable.get(key);
      reusable.delete(key);
      if (row && row.item.peek() !== item) row.item.value = item;
      plan[i] = row;
    }
    for (const row of reusable.values()) this.outlet.retire(row);
    this.place(items, keys, plan);
  }

  /** Walks from the end so each row is placed before the row that follows it. */
  private place(items: readonly unknown[], keys: unknown[], plan: (Row | undefined)[]): void {
    const next: Row[] = new Array(items.length);
    let anchor: Node = this.marker;
    for (let i = items.length - 1; i >= 0; i--) {
      const kept = plan[i];
      const row = kept ? this.keep(kept, i, anchor) : this.create(items[i], keys[i], i, anchor);
      next[i] = row;
      anchor = row.start;
    }
    this.rows = next;
  }

  private keep(row: Row, index: number, anchor: Node): Row {
    if (row.index) row.index.value = index;
    if (this.outlet.skipLeaving(row.end.nextSibling) !== anchor) moveBefore(row, anchor);
    return row;
  }

  private create(item: unknown, key: unknown, index: number, anchor: Node): Row {
    const cleanups: Cleanup[] = [];
    const leaves: Leave[] = [];
    const indexVariable = this.spec.indexed ? variable(index) : undefined;
    const itemVariable = variable(item);
    const fragment = this.spec.render(itemVariable, indexVariable, cleanups, leaves);
    const row: Row = {
      ...mountBefore(anchor, fragment, cleanups, leaves),
      item: itemVariable,
      key,
      index: indexVariable,
    };
    this.outlet.track(row);
    return row;
  }
}

/** Keeps a row's item local current, so its event handlers see the item the row now shows. */
export function followItem(item: Variable<unknown>, assign: (value: unknown) => void): Cleanup {
  return watch(() => assign(item.value));
}

/** Renders one row per item. The list is read in a watch, so a new array or variable value reconciles the rows. */
export function bindEach(
  marker: Comment,
  spec: EachSpec,
  cleanups: Cleanup[],
  leaves: Leave[],
): void {
  const block = new EachBlock(marker, { ...spec, render: keepScope(spec.render) }, leaves);
  cleanups.push(
    watch(() => block.update(listOf(spec.read()))),
    () => block.dispose(),
  );
}
