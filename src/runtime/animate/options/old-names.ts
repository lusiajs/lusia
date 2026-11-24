import { runtimeError } from "../../errors.ts";
import type { AnimateItem } from "../animation.ts";

/** Each old item name has its own error, so an old item fails with the fix instead of a generic typo error. */
export function rejectOldNames(item: AnimateItem): void {
  if ("animation" in item) throw runtimeError("L2045");
  if ("active" in item) throw runtimeError("L2046");
  if ("style" in item) throw runtimeError("L2084");
  if ("when" in item) throw runtimeError("L2085");
  if ("more" in item) throw runtimeError("L2086");
  if ("ease" in item) throw runtimeError("L2005");
  if ("curve" in item || "transition" in item) throw runtimeError("L2006");
  if ("alternate" in item) throw runtimeError("L2007");
  if ("reverse" in item) throw runtimeError("L2008");
  if ("midway" in item && item.midway === undefined) throw runtimeError("L2081");
}
