import { runtimeError } from "../errors.ts";
import { addGlobalConfig } from "./global.ts";
import { mergeConfig } from "./merge.ts";
import { readConfig } from "./read-config.ts";
import { renderingScope, replaceRenderingScope, type RuntimeConfig } from "./scope.ts";

export const SCOPE = Object.freeze({ SCOPED: "scoped", TREE: "tree", GLOBAL: "global" } as const);

export type ConfigScope = (typeof SCOPE)[keyof typeof SCOPE];

const REACHES: readonly string[] = Object.values(SCOPE);

/** Sets runtime config for a component and what it renders (SCOPED, TREE), or for the whole app (GLOBAL). */
export function setConfig(config: RuntimeConfig, reach: ConfigScope = SCOPE.TREE): void {
  if (!REACHES.includes(reach)) throw runtimeError("L2077", { value: String(reach) });
  const checked = readConfig(config);
  if (reach === SCOPE.GLOBAL) {
    setGlobal(checked);
    return;
  }
  setInComponent(checked, reach);
}

function setInComponent(config: RuntimeConfig, reach: ConfigScope): void {
  const current = renderingScope();
  if (current === null) {
    throw runtimeError("L2075", { reach: reach === SCOPE.TREE ? "SCOPE.TREE" : "SCOPE.SCOPED" });
  }
  replaceRenderingScope({
    own: mergeConfig(current.own, config),
    inherited: reach === SCOPE.TREE ? mergeConfig(current.inherited, config) : current.inherited,
  });
}

function setGlobal(config: RuntimeConfig): void {
  if (renderingScope() !== null) throw runtimeError("L2076");
  addGlobalConfig(config);
}
