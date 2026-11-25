import { decodePart } from "./pattern.ts";

/** Scrolls to the element named by the hash, or to the top of the page when there is no such element. */
export function scrollToHash(): void {
  const id = decodePart(location.hash.slice(1));
  const target = id === "" ? null : document.getElementById(id);
  if (target) target.scrollIntoView();
  else window.scrollTo(0, 0);
}
