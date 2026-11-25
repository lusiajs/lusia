const injectedStyles = new Map<string, HTMLStyleElement>();

/** True when the build already wrote this style into the shared CSS file that the page links. */
function isPrerendered(id: string): boolean {
  if (!document.querySelector("link[data-lusia-ssr]")) return false;
  return (document.documentElement.dataset.lusiaStyles ?? "").split(" ").includes(id);
}

export function injectStyle(id: string, css: string): void {
  if (!css || injectedStyles.has(id) || isPrerendered(id)) return;
  const style = document.createElement("style");
  style.dataset.lusia = id;
  style.textContent = css;
  document.head.appendChild(style);
  injectedStyles.set(id, style);
}

/** Changes a component's injected style in place. Used by the dev hot swap. */
export function replaceStyle(id: string, css: string): void {
  const style = injectedStyles.get(id);
  if (style) style.textContent = css;
  else injectStyle(id, css);
}
