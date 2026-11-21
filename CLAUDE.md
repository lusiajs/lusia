# CLAUDE.md

Lusia is a Bun-native UI framework: single-file `.lusia` components, variables and scoped SCSS.

Commands and repo layout: [CONTRIBUTING.md](CONTRIBUTING.md). Site Guide: https://lusia.azpepoze.com/guide. API table: [reference/api.ts](reference/api.ts).

This repo is the framework. Sibling repos live next to it, in the same parent folder: `create` (npm `create-lusia`), `vsix` (VS Code extension), `docs` (site). They depend on the published `lusia` package, so a framework change reaches them only after a release.

# 1. Keep docs in the same change
Update `reference/api.ts` with every public API or markup change. Then update the Guide in the `docs` repo (a follow-up PR after the release). The README stays a front page.

# 2. Update all highlighters
A `.lusia` syntax change (tag, attribute, keyword, export) updates `src/language` here, then the `vsix` repo (grammar, completion, hover, lint, formatter) and the `docs` repo (Prism `lusia` language). Not done while any shows it as plain text.

# 3. Keep the API table in sync
`reference/api.ts` is exported as `lusia/api` and feeds the `vsix` and `docs` repos. Change it with every public API or markup change.

# 4. Main agent orchestrates
Plan, write exact specs, review and test. Haiku subagents do the coding, tests and docs edits.

# 5. Main agent writes only hard core logic
Variable graph, template scanner, binding order. Say so when you do.

# 6. One worktree per agent
Worktrees go in `.worktrees/` (gitignored): `git worktree add .worktrees/<name> -b <branch> dev`. Start with `git rebase dev`. Keep screenshots and scripts in `.agent/` inside the worktree, never in `/tmp`.

# 7. Merge through dev
The main agent reviews, runs `bun run check`, and merges into `dev`. Only the user moves `dev` to `main`.

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
Do not invent new syntax or borrow Svelte's (`{#if}`, `on:`, runes, `export let`). Syntax changes need the user.

# 15. Designed syntax is fixed
Events (`onclick={fn}`), `bind-value`, flow tags (`<IF>`, `<ELSEIF>`, `<ELSE>`, `<EACH>`, `<FOR>`) and `animate` follow the site Guide. Change them only with the user. `animate` uses one special attribute, options inside the value, and enums `EASE` (with `EASE.STYLE`) and `WHEN`.

# 16. Deferred features
SSR and hydration wait until designed with the user.

# 17. Docs showcase
The `docs` repo shows every feature with a live demo and its source. `examples/stress` pushes the limits.

# 18. Guide is a learning path
Order groups and entries so a beginner meets each idea before anything that uses it: simplest first, advanced last. Keep sub-navs short. The main agent may reorganize the Guide freely when it helps the reader.

# 19. Domain folders
Framework logic lives in domain folders: `parse/`, `style/`, `template/`, `variable/`, `dom/`.

# 20. Shared helpers in utils
`utils/` holds only helpers used by two or more domains. Move a helper there when a second domain needs it.

# 21. One job per file
Each file does one job and stays under about 150 lines.

# 22. Tests mirror source
Test folders match the source folders.

# 23. Import aliases
Imports across areas use `#runtime/`, `#compiler/`, `#bun-plugin/`, `#cli/`, `#language/` (the `imports` map in `package.json`, so they also resolve for apps that install `lusia`), except inside `src/runtime`: it ships to apps and uses relative imports only. Same-area imports stay relative.

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
