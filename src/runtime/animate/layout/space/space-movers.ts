export interface Box {
  top: number;
  left: number;
}

/** A moved element. `remaining` is how much of the shift is left: 1 at the old place, 0 at the new place. */
export interface Mover {
  el: HTMLElement;
  dx: number;
  dy: number;
  remaining: number;
}

/** What an element had before any slide began, and the slides that are moving it now. */
interface ElementShifts {
  inline: string;
  base: string;
  movers: Set<Mover>;
}

const MIN_SHIFT = 0.5;

// Slides that overlap on one element must share the original transform, or the last one to end restores a stale value.
const shiftsOf = new WeakMap<HTMLElement, ElementShifts>();

/**
 * The elements whose place can change when `el` enters or leaves: each ancestor and each sibling of the element and of its ancestors.
 * Sorted from the top down, so an ancestor is compensated before its children.
 */
export function movingElements(el: HTMLElement): HTMLElement[] {
  const found = new Set<HTMLElement>();
  let node = el;
  let parent = node.parentElement;
  while (parent && parent !== document.documentElement) {
    for (const sibling of parent.children) {
      if (sibling instanceof HTMLElement && sibling !== node) found.add(sibling);
    }
    if (parent !== document.body) found.add(parent);
    node = parent;
    parent = node.parentElement;
  }
  return [...found].sort((a, b) => depthOf(a) - depthOf(b));
}

function depthOf(el: HTMLElement): number {
  let depth = 0;
  for (let node = el.parentElement; node; node = node.parentElement) depth++;
  return depth;
}

/** Undefined for an element with no box, such as `display: none`. */
export function boxesOf(elements: HTMLElement[]): Array<Box | undefined> {
  return elements.map(boxOf);
}

function boxOf(el: HTMLElement): Box | undefined {
  if (el.getClientRects().length === 0) return undefined;
  const rect = el.getBoundingClientRect();
  return { top: rect.top, left: rect.left };
}

/**
 * Moves each element that changed place back to its `before` place. Each one is read after the ones above it moved,
 * so a child of a moved ancestor only gets the shift it still needs. Elements that did not move keep their transform.
 */
export function compensate(elements: HTMLElement[], before: Array<Box | undefined>): Mover[] {
  const movers: Mover[] = [];
  elements.forEach((el, i) => {
    const from = before[i];
    const to = boxOf(el);
    if (!from || !to) return;
    const dx = from.left - to.left;
    const dy = from.top - to.top;
    if (Math.abs(dx) < MIN_SHIFT && Math.abs(dy) < MIN_SHIFT) return;
    const mover: Mover = { el, dx, dy, remaining: 1 };
    movers.push(mover);
    join(mover);
    applyShifts(mover.el);
  });
  return movers;
}

/** Puts the elements back into flow from where they are now, so they slide back without a jump. */
export function reopenMovers(
  elements: HTMLElement[],
  movers: Mover[],
  enterFlow: () => void,
): Mover[] {
  const before = boxesOf(elements);
  for (const mover of movers) restoreShift(mover);
  enterFlow();
  return compensate(elements, before);
}

/** `remaining` is 1 at the old place and 0 at the new place. */
export function writeShift(mover: Mover, remaining: number): void {
  if (!shiftsOf.get(mover.el)?.movers.has(mover)) return;
  mover.remaining = remaining;
  applyShifts(mover.el);
}

export function restoreShift(mover: Mover): void {
  const shifts = shiftsOf.get(mover.el);
  if (!shifts?.movers.delete(mover)) return;
  if (shifts.movers.size > 0) {
    applyShifts(mover.el);
    return;
  }
  mover.el.style.transform = shifts.inline;
  shiftsOf.delete(mover.el);
}

function join(mover: Mover): void {
  const shifts = shiftsOf.get(mover.el) ?? startShifts(mover.el);
  shifts.movers.add(mover);
}

function startShifts(el: HTMLElement): ElementShifts {
  const shifts: ElementShifts = {
    inline: el.style.transform,
    base: computedTransformOf(el),
    movers: new Set(),
  };
  shiftsOf.set(el, shifts);
  return shifts;
}

/** The sum of every slide on the element, in front of the transform it had before. */
function applyShifts(el: HTMLElement): void {
  const shifts = shiftsOf.get(el);
  if (!shifts) return;
  let dx = 0;
  let dy = 0;
  for (const mover of shifts.movers) {
    dx += mover.dx * mover.remaining;
    dy += mover.dy * mover.remaining;
  }
  el.style.transform = `translate(${dx}px, ${dy}px) ${shifts.base}`;
}

function computedTransformOf(el: HTMLElement): string {
  const transform = getComputedStyle(el).transform;
  return transform === "none" ? "" : transform;
}
