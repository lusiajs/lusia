const holders = new Map<Element, number>();
let sizes: ResizeObserver | undefined;

export function startSizes(onResize: () => void): void {
  sizes = new ResizeObserver(onResize);
}

export function stopSizes(): void {
  sizes?.disconnect();
  sizes = undefined;
  holders.clear();
}

/** Each element is observed once, however many scroll items measure it. */
export function holdSize(el: Element | null): void {
  if (el === null) return;
  const count = holders.get(el) ?? 0;
  holders.set(el, count + 1);
  if (count === 0) sizes?.observe(el);
}

export function releaseSize(el: Element | null): void {
  if (el === null) return;
  const count = (holders.get(el) ?? 0) - 1;
  if (count > 0) {
    holders.set(el, count);
    return;
  }
  holders.delete(el);
  sizes?.unobserve(el);
}
