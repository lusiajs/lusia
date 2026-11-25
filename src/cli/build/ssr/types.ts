import type { LazySettings } from "#bun-plugin/children.ts";
import type { AnimateConfig } from "#runtime/animate/options/config.ts";
import type { Screens } from "#runtime/screen/screens.ts";

export interface RenderSettings {
  lazy?: LazySettings;
  animate?: AnimateConfig;
  screens?: Screens;
}

/** What one render worker needs. The parent sends it as one JSON argument. */
export interface RenderRequest {
  route: string;
  /** The address the page renders at. */
  urlPath: string;
  /** Absolute page file for every route key, so the router matches as it does in the browser. */
  pages: Record<string, string>;
  /** The built index.html that the page starts from. */
  indexPath: string;
  settings: RenderSettings;
  /** Where the worker writes its RenderResult. */
  resultPath: string;
}

export interface RenderedStyle {
  id: string;
  css: string;
}

export interface RenderResult {
  head: string;
  body: string;
  styles: RenderedStyle[];
}
