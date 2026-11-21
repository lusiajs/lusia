import { variable } from "lusiajs";

export interface Item {
  id: number;
  title: string;
}

/** Shared by the block and bind fixtures. Tests reset it in beforeEach. */
export const state = {
  count: variable(0),
  text: variable("hi"),
  checked: variable(false),
  number: variable<number | null>(3),
  choice: variable("a"),
  disabled: variable(false),
  ref: variable<Element | null>(null),
  mode: variable("a"),
  items: variable<Item[]>([]),
  picked: variable<number | null>(null),
  from: variable(0),
  to: variable(3),
  step: variable(1),
  groups: variable<{ name: string; open: boolean; items: string[] }[]>([]),
};

export function resetVariable(): void {
  state.count.value = 0;
  state.text.value = "hi";
  state.checked.value = false;
  state.number.value = 3;
  state.choice.value = "a";
  state.disabled.value = false;
  state.ref.value = null;
  state.mode.value = "a";
  state.items.value = [];
  state.picked.value = null;
  state.from.value = 0;
  state.to.value = 3;
  state.step.value = 1;
  state.groups.value = [];
}
