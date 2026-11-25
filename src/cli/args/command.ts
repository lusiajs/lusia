import type { LazySettings } from "#bun-plugin/children.ts";
import type { AnimateConfig } from "#runtime/animate/options/config.ts";
import type { Screens } from "#runtime/screen/screens.ts";
import type { LintRuleSettings } from "#language/lint/lint.ts";
import type { CacheSettings } from "./settings.ts";

export type Command =
  | { name: "help" }
  | {
      name: "build";
      dir: string;
      outdir: string;
      minify: boolean;
      routes: Record<string, string>;
      ssr: boolean;
      quiet: boolean;
      lazy: LazySettings;
      animate: AnimateConfig;
      screens?: Screens;
      cache: CacheSettings;
    }
  | {
      name: "dev";
      dir: string;
      port: number;
      quiet: boolean;
      lazy: LazySettings;
      animate: AnimateConfig;
      screens?: Screens;
      routes: Record<string, string>;
      cache: CacheSettings;
    }
  | {
      name: "clean";
      dir: string;
      quiet: boolean;
    }
  | {
      name: "format";
      paths: string[];
      check: boolean;
      quiet: boolean;
      cache: boolean;
      indentScriptAndStyle: boolean;
    }
  | {
      name: "lint";
      paths: string[];
      fix: boolean;
      maxWarnings: number;
      quiet: boolean;
      rules: LintRuleSettings | undefined;
    };
