import type { ModuleUpdate } from "#bun-plugin/update.ts";

interface StyleUpdate {
  id: string;
  css: string;
}

/** A hot update swaps the changed components (`paths`, absolute) in place. */
export type Update =
  | { kind: "reload" }
  | { kind: "styles"; styles: StyleUpdate[] }
  | { kind: "hot"; paths: string[]; styles: StyleUpdate[] };

export const RELOAD: Update = { kind: "reload" };

const STYLE_FILE = /\.(lusia|scss|sass)$/;
const COMPONENT_FILE = /\.lusia$/;

// Styles only is a css swap; components only is a hot swap; anything else reloads.
export function chooseUpdate(files: string[], changes: ModuleUpdate[]): Update {
  if (files.length === 0 || !files.every(isStyleFile)) return RELOAD;
  const styles: StyleUpdate[] = [];
  const paths: string[] = [];
  for (const change of changes) {
    if (change.kind === "code") paths.push(change.path);
    else styles.push({ id: change.id, css: change.css });
  }
  if (paths.length === 0) return { kind: "styles", styles };
  if (!paths.every((path) => COMPONENT_FILE.test(path))) return RELOAD;
  return { kind: "hot", paths, styles };
}

function isStyleFile(file: string): boolean {
  return STYLE_FILE.test(file);
}
