type Handler = (event: unknown) => void;

interface Watcher {
  el: Element;
  handler: Handler;
}

// Capture sees the press before anything inside the page can stop it.
const CAPTURE = { capture: true };
const watchers = new Set<Watcher>();

/** One shared pair of document listeners serves every EVENT.CLICK_OUTSIDE. */
export function watchClickOutside(el: Element, handler: Handler): () => void {
  const watcher: Watcher = { el, handler };
  if (watchers.size === 0) startListening();
  watchers.add(watcher);
  return () => {
    if (!watchers.delete(watcher)) return;
    if (watchers.size === 0) stopListening();
  };
}

function startListening(): void {
  document.addEventListener("pointerdown", onPress, CAPTURE);
  document.addEventListener("keydown", onKey, CAPTURE);
}

function stopListening(): void {
  document.removeEventListener("pointerdown", onPress, CAPTURE);
  document.removeEventListener("keydown", onKey, CAPTURE);
}

// A copy, so a handler that stops itself or another watcher does not skip anyone.
function onPress(event: PointerEvent): void {
  const target = event.target as Node;
  for (const watcher of [...watchers]) {
    if (!watcher.el.contains(target)) watcher.handler(event);
  }
}

function onKey(event: KeyboardEvent): void {
  if (event.key !== "Escape") return;
  for (const watcher of [...watchers]) watcher.handler(event);
}
