import { attach, type Instance } from "lusiajs";
import Table from "./Table.lusia";

export const PARENTS = 500;
export const ROWS_PER_TABLE = 10;

export function attachTables(target: Element, total: number): Instance[] {
  const instances: Instance[] = [];
  for (let id = 0; id < total; id++) instances.push(attach(Table, target, { id: () => id }));
  return instances;
}

export function detachTables(instances: Instance[]): void {
  for (const instance of instances) instance.detach();
}
