import { variable } from "lusiajs";

/** Shared by LateParent and its test. The test resets it in beforeEach. */
export const late = {
  rows: variable<string[]>([]),
  show: variable(false),
};
