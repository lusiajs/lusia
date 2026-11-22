import type { ApiEntry } from "./types.ts";

export const screenEntries: ApiEntry[] = [
  {
    id: "screen",
    name: "SCREEN",
    kind: "value",
    group: "styling",
    signature:
      "const SCREEN: { readonly PHONE: ComputedVariable<boolean>; readonly TABLET: ComputedVariable<boolean>; readonly DESKTOP: ComputedVariable<boolean>; readonly REDUCED_MOTION: ComputedVariable<boolean> }",
    summary: "One read-only flag per screen size. Exactly one size is true at a time.",
    bullets: [
      "A size is on when the window is at least its start width and below the next one. Sizes come from screens in lusia.config.",
      "Use it in markup: <IF {SCREEN.PHONE}>. It updates when the window is resized.",
      "REDUCED_MOTION is true when the user asks for less motion.",
      "Read it with .value or .get() in a script. A flag cannot be set.",
      "Outside a browser, only the smallest size is on.",
    ],
    example: `<script>\n  import { SCREEN } from "lusiajs";\n</script>\n\n<IF {SCREEN.PHONE}>\n  <p>Small window</p>\n<ELSE>\n  <p>Wide window</p>\n</IF>`,
    members: [
      {
        name: "PHONE",
        summary: "On from 0 px, until the next screen starts. The default smallest size.",
      },
      { name: "TABLET", summary: "On from 600 px to 999.98 px. The default middle size." },
      { name: "DESKTOP", summary: "On from 1000 px up. The default widest size." },
      { name: "REDUCED_MOTION", summary: "On when the user prefers reduced motion." },
    ],
  },
  {
    id: "style-screen-if",
    name: "<style> in <IF {SCREEN.X}>",
    kind: "markup",
    group: "styling",
    signature: "<IF {SCREEN.X}><style> SCSS </style></IF>",
    summary: "A style that applies only at some screen sizes.",
    bullets: [
      "Put a <style> inside an <IF>, <ELSEIF> or <ELSE> whose condition is a SCREEN flag. The style becomes a media query.",
      "Only SCREEN flags can set the condition. Use a class for other conditions.",
      "A style can also sit inside <IF {SCREEN.REDUCED_MOTION}> to apply only when motion is reduced.",
      "Styles are built once, so they do not run again when the window resizes. The browser applies the media query.",
    ],
    example: `<p class="card">Card</p>\n\n<IF {SCREEN.PHONE}>\n  <style>\n  .card { padding: 8px; }\n  </style>\n<ELSE>\n  <style>\n  .card { padding: 24px; }\n  </style>\n</IF>`,
  },
  {
    id: "style-screen-mixin",
    name: "@include screen()",
    kind: "style",
    group: "styling",
    signature: "@include screen(PHONE, TABLET) { ... }",
    summary: "A Sass mixin that wraps rules in the media query of one or more screen sizes.",
    bullets: [
      "Works in every <style> with no @use. Pass one or more screen names, such as screen(PHONE, TABLET).",
      "Use the names from screens in lusia.config. An unknown name is an error.",
      "Put the rules to wrap inside the braces. They are scoped like the rest of the style.",
      "Use it for plain rules. Use <IF {SCREEN.X}> with a <style> when the markup decides the style.",
    ],
    example: `<p class="card">Card</p>\n\n<style>\n  .card { padding: 24px; }\n  @include screen(PHONE, TABLET) {\n    .card { padding: 8px; }\n  }\n</style>`,
  },
  {
    id: "config-screens",
    name: "screens",
    kind: "value",
    group: "styling",
    signature: "screens: { PHONE: 0, TABLET: 600, DESKTOP: 1000 }",
    summary: "Screen sizes for SCREEN, the screen() mixin and <IF {SCREEN.X}> styles.",
    bullets: [
      "Each name is the width in px where that screen starts. Names are UPPER_SNAKE_CASE, such as WIDE_DESKTOP.",
      "The smallest screen must start at 0. Each screen needs its own start width.",
      "REDUCED_MOTION is not a screen name. It is always there.",
      "Set it in lusia.config. It cannot be set with setConfig.",
    ],
    example: `// lusia.config.ts\nimport { defineConfig } from "lusiajs/config";\n\nexport default defineConfig({\n  screens: { PHONE: 0, TABLET: 700, DESKTOP: 1200 },\n});`,
  },
];
