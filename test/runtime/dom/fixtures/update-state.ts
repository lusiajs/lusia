import { variable } from "lusiajs";

export interface Row {
  id: number;
  title: string;
  tags: string[];
  done: boolean;
}

/** Shared by the EACH update fixtures. Tests reset it in beforeEach. */
export const updateState = {
  rows: variable<Row[]>([]),
  picked: variable<string | null>(null),
  attaches: variable(0),
};

export function resetUpdateState(): void {
  updateState.rows.value = [];
  updateState.picked.value = null;
  updateState.attaches.value = 0;
}
