import { runtimeError } from "../../errors.ts";
import type { AnimateItem } from "../animation.ts";
import type { Source } from "../modes/trigger.ts";
import { isReactive } from "../../variable/reactive.ts";

/** A glide item moves its element to the element its variable holds. It takes no play and no on. */
export function readGlideTarget(item: AnimateItem): Source | undefined {
  if (!("glide" in item)) return undefined;
  if ("play" in item || "on" in item) throw runtimeError("L2089");
  if (!isReactive(item.glide)) throw runtimeError("L2090", { value: String(item.glide) });
  return item.glide;
}
