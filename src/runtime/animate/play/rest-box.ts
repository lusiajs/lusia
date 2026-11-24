const TRANSFORM_PROPERTIES = ["translate", "scale", "rotate", "transform"];

/** The box the element has with no inline transform. Clearing and restoring is synchronous, so nothing paints. */
export function restBox(el: HTMLElement): DOMRect {
  const style = el.style;
  const saved = TRANSFORM_PROPERTIES.map((name) => style.getPropertyValue(name));
  if (saved.every((value) => value === "")) return el.getBoundingClientRect();
  TRANSFORM_PROPERTIES.forEach((name) => style.removeProperty(name));
  const box = el.getBoundingClientRect();
  TRANSFORM_PROPERTIES.forEach((name, index) => {
    if (saved[index] !== "") style.setProperty(name, saved[index]!);
  });
  return box;
}
