import { goTo } from "./location.ts";

function hasModifier(event: MouseEvent): boolean {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

// Only plain left clicks on a same-origin link. Other clicks keep the browser's own behaviour.
function linkToFollow(event: MouseEvent): HTMLAnchorElement | undefined {
  if (event.defaultPrevented || event.button !== 0 || hasModifier(event)) return undefined;
  if (!(event.target instanceof Element)) return undefined;
  const link = event.target.closest("a[href]");
  if (!(link instanceof HTMLAnchorElement)) return undefined;
  if (link.target || link.hasAttribute("download")) return undefined;
  if (new URL(link.href).origin !== location.origin) return undefined;
  return link;
}

export function followLinks(): void {
  document.addEventListener("click", (event) => {
    const link = linkToFollow(event);
    if (!link) return;
    event.preventDefault();
    goTo(link.href);
  });
}
