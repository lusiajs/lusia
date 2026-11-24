# CLAUDE.md

Lusia is a Bun-native UI framework: single-file `.lusia` components, variables and scoped SCSS.

Commands and repo layout: [CONTRIBUTING.md](CONTRIBUTING.md). Site Guide: https://lusia.azpepoze.com/guide. API table: [reference/api.ts](reference/api.ts).

This repo is the framework. Sibling repos live next to it, in the same parent folder: `create` (npm `create-lusiajs`), `vsix` (VS Code extension), `docs` (site). They depend on the published `lusiajs` package, so a framework change reaches them only after a release.

# 1. Keep docs in the same change

Update `reference/api.ts` with every public API or markup change. Then update the Guide in the `docs` repo (a follow-up PR after the release). The README stays a front page.

# 2. Update all highlighters

A `.lusia` syntax change (tag, attribute, keyword, export) updates `src/language` here, then the `vsix` repo (grammar, completion, hover, lint, formatter) and the `docs` repo (Prism `lusia` language). Not done while any shows it as plain text.

# 3. Keep the API table in sync

`reference/api.ts` is exported as `lusiajs/api` and feeds the `vsix` and `docs` repos. Change it with every public API or markup change.

# 4. Main agent orchestrates

Plan, write exact specs, review and test. Haiku subagents do the coding, tests and docs edits.

# 5. Main agent writes only hard core logic

Variable graph, template scanner, binding order. Say so when you do.

# 6. One worktree per agent

Worktrees go in `.worktrees/` (gitignored): `git worktree add .worktrees/<name> -b <branch> dev`. Start with `git rebase dev`. Keep screenshots and scripts in `.agent/` inside the worktree, never in `/tmp`.

# 7. Merge through dev

The main agent reviews, runs `bun run check`, and merges into `dev`. Only the user moves `dev` to `main`.

# 7a. Versions of the sibling packages

`create-lusiajs` uses the same version as `lusiajs` (a beta is `0.1.0-beta.1` in both). The VS Code extension (`vsix`) has the same `major.minor` as the lusia it supports and its own patch: lusia `0.1.x` goes with extension `0.1.x`, and every extension-only release bumps only the patch (`0.1.0`, `0.1.1`). The Marketplace rejects a fourth number (`0.1.0.1`) and pre-release suffixes, so the extension never uses them. When `lusia` moves to a new `major.minor`, also release `vsix` with that `major.minor`. Full rule: `vsix/CLAUDE.md`.

# 8. Issues only for unfinished work

Open a GitHub issue only for work left open or a feature the user wants tracked. Add details as comments on an existing issue. Close it with a comment once merged into `dev` and `bun run check` passes. Reference it in the commit (`refs #N`).

# 9. Check before reporting done

`bun run check` must pass (typecheck and tests). Set `LUSIA_CHROMIUM` so browser tests run.

# 10. Update demos with features

A feature or behavior change updates `examples/stress` when it affects those scenarios, and its showcase section in the `docs` repo.

# 11. Simplest English names

Public names use common words for beginners and non-native speakers: `variable`, `variable.compute`, `variable.autoRun`, not `signal`, `derive`, `effect`. Avoid jargon and long words in names, errors and docs.

# 12. Use "update", never "change"

In public names and docs: `variable.watch`, `count.onUpdate`, `UpdateOptions`. The DOM `change` event keeps its name.

# 13. Reuse existing words

A new option for the same idea reuses the word with a prefix: `duration` -> `outDuration`. Never add a synonym (`time`, `length`, `curve`, `transition`).

# 14. The user designs markup syntax

Do not invent new syntax or borrow Svelte's (`{#if}`, runes, `export let`). Syntax changes need the user. `on:name={fn}` is the user's own design, not a borrowed one.

# 15. Designed syntax is fixed

Events (`onclick={fn}` for DOM events, `on:name={fn}` for DOM and `EVENT` names through `listen`), `bind-value`, flow tags (`<IF {a}> ... <ELSEIF {b}> ... <ELSE> ... </IF>`, with one closing `</IF>`; `<EACH>`, `<FOR>`) and `animate` follow the site Guide. Change them only with the user. `animate` uses one special attribute, options inside the value, and enums `EASE` (with `EASE.STYLE`), `ON` and `MIDWAY`. `listen` uses `EVENT`. Scroll `start`/`end` are `[element edge, screen edge]` pairs of `EDGE`. Component names may be any identifier that is not an HTML, SVG or MathML tag.

# 16. Deferred features

SSR and hydration wait until designed with the user.

# 17. Docs showcase

The `docs` repo shows every feature with a live demo and its source. `examples/stress` pushes the limits.

# 18. Guide is a learning path

Order groups and entries so a beginner meets each idea before anything that uses it: simplest first, advanced last. Keep sub-navs short. The main agent may reorganize the Guide freely when it helps the reader.

# 19. Domain folders

Framework logic lives in domain folders: `parse/`, `style/`, `template/`, `variable/`, `dom/`.

`src/integrations/` holds add-ons for other tools: `vscode-support`, `prettier-plugin`.

# 20. Shared helpers in utils

`utils/` holds only helpers used by two or more domains. Move a helper there when a second domain needs it.

# 21. One job per file

Each file does one job and stays under about 150 lines.

# 22. Tests mirror source

Test folders match the source folders.

# 23. Import aliases

Imports across areas use `#runtime/`, `#compiler/`, `#bun-plugin/`, `#cli/`, `#language/`, `#integrations/`, `#config/`, `#reference/` (the `imports` map in `package.json`, so they also resolve for apps that install `lusiajs`), except inside `src/runtime`: it ships to apps and uses relative imports only. Same-area imports stay relative.

# 24. Clean design over quick fixes

Pick the clean approach. If it needs a refactor, do the refactor.

# 25. Full, readable names

Name files and variables in full: `attribute.ts`, not `attr.ts`; `template`, not `tpl`. Use plain words, no abbreviations or clever names.

# 26. Readable code

Extract a named function when a block is hard to read. Call sites stay short. No nested ternaries, no inline IIFEs.

# 27. Performance

No allocations on hot paths where avoidable. Real-time code (audio, render loops) must not allocate, lock or log.

# 28. Comments

Default to no comments. Keep one line only for a non-obvious why. Never restate the code, and no doc comments on self-named symbols.

# 29. Indent script and style

Indent the code inside `<script>` and `<style>` of a `.lusia` file by 2 spaces, in source files, templates and every example. The framework allows flush-left code, but this is the house style. Full example: `docs/CLAUDE.md` rule 11.

# 30. Messages: result first, then why

Lint warnings and errors state the result first, then a short reason, then the fix: `".odd" is not used. No element in this component or its child components has this class.` Never open with what the compiler knows or cannot know.

# 31. Style scoping uses classes

Scoped styles match by short component classes, not ancestor selectors (about 40x faster style recalc). `lN` styles only the component's own markup, including markup it passes into a child's slot. `tN` styles the component and everything inside it. Child components get their ancestors' `tN` at runtime from one cached template copy per ancestor chain, and `attach()` reads them from the element it mounts into. Keep hot paths free of per-element work.

# 32. Class lint stays quiet when unsure

`unused-class` never flags a class that might be used. A class from an imported value counts as used only when its TypeScript type is a union of string literals. A wider type gets an `untyped-class` warning instead. `// @on-purpose` at the end of a line (or `/* @on-purpose */` in plain CSS and in markup braces) skips the warning.

# 33. Branches

Work from `main`. Only `main` and `dev` stay long-lived. Delete a branch once it is merged.

# 34. Reuse before writing

Before writing logic, search the repo for code that already does the same job (a check, a cache, a parser, a helper). Reuse or extend it. When two places need the same thing, make one shared helper or base interface and have both use it. Never write a second version. Every agent spec includes this check.
