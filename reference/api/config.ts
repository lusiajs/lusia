import type { ApiEntry } from "./types.ts";

export const configEntries: ApiEntry[] = [
  {
    id: "set-config",
    name: "setConfig()",
    kind: "function",
    group: "motion",
    signature: "setConfig(config: RuntimeConfig, reach?: ConfigScope): void",
    summary: "Sets runtime settings for a component, or for the whole app.",
    bullets: [
      "config takes animate and lazy.prefetch. Build settings such as outdir go in lusia.config.",
      "Reach SCOPE.TREE (the default) covers this component and every component inside it. SCOPE.SCOPED covers only this component's own markup.",
      "Call TREE and SCOPED at the top of a component script. Call SCOPE.GLOBAL in onAttach, onDetach or a function.",
      "SCOPE.GLOBAL sets the whole app and lasts until the page ends. Nearest wins: a component setting beats a global one.",
    ],
    example: `<script>\n  import { onAttach, setConfig, SCOPE } from "lusiajs";\n\n  setConfig({ animate: { attach: { animateSpace: true } }, lazy: { prefetch: "view" } });\n\n  onAttach(() => {\n    setConfig({ animate: { duration: 400 } }, SCOPE.GLOBAL);\n  });\n</script>`,
  },
  {
    id: "scope",
    name: "SCOPE",
    kind: "value",
    group: "motion",
    signature:
      'const SCOPE: { readonly SCOPED: "scoped"; readonly TREE: "tree"; readonly GLOBAL: "global" }',
    summary: "How far a setConfig call reaches.",
    bullets: [
      "SCOPED: this component's own markup, including its IF and EACH blocks. Not child components.",
      "TREE (the default): this component and every component rendered inside it.",
      "GLOBAL: the whole app. Call it in onAttach, onDetach or a function, not at the top of a script.",
    ],
    example: `import { setConfig, SCOPE } from "lusiajs";\n\nsetConfig({ animate: { duration: 200 } }, SCOPE.SCOPED);`,
    members: [
      { name: "SCOPED", summary: "This component's own markup only." },
      { name: "TREE", summary: "This component and everything inside it. The default." },
      { name: "GLOBAL", summary: "The whole app, set from onAttach, onDetach or a function." },
    ],
  },
];
