# Contributing to Lusia

Thanks for helping. Read the rules, set up, then open a pull request.

## Repo layout

| Path                       | What it holds                                                               |
| -------------------------- | --------------------------------------------------------------------------- |
| `src/runtime`              | The `lusiajs` package: variables, DOM helpers, animate                      |
| `src/compiler`             | Turns `.lusia` files into TypeScript modules                                |
| `src/language`             | Parse, format and lint for `.lusia` files                                   |
| `src/integrations`         | Add-ons for other tools: `vscode-support` (editor logic), `prettier-plugin` |
| `src/bun-plugin`           | The Bun loader for `.lusia` files                                           |
| `src/cli`                  | The `lusia` command                                                         |
| `test/`                    | Tests. One folder per area, mirroring `src/`                                |
| `examples/stress`          | Scenarios that push the limits                                              |
| `reference/api.ts`         | The API table, read by the extension and the docs site                      |
| `packages/prettier-plugin` | `@lusiajs/prettier-plugin`, the Prettier plugin for `.lusia` files          |
| `scripts/`                 | `check.ts` for `bun run check`                                              |

## Other repos

| Repo                                                | Uses `lusiajs` for    |
| --------------------------------------------------- | --------------------- |
| [lusiajs/create](https://github.com/lusiajs/create) | The starter app       |
| [lusiajs/vsix](https://github.com/lusiajs/vsix)     | The VS Code extension |
| [lusiajs/docs](https://github.com/lusiajs/docs)     | The docs site         |

## Rules

- Framework logic goes in domain folders: `parse/`, `style/`, `template/`, `variable/`, `dom/`.
- Keep one job per file, around 150 lines.
- Put a helper in `utils/` only when two or more domains use it.
- Imports across areas use the `#runtime/`, `#compiler/`, `#bun-plugin/`, `#cli/` and `#language/` aliases. `src/runtime` ships to apps, so it uses relative imports only.
- A change to the API or to `.lusia` markup updates `reference/api.ts` and `examples/stress` in the same change.
- Then update `lusiajs/docs` (Guide, demos, Prism language) and `lusiajs/vsix` (grammar, completion, hover, lint, formatter).
- New error codes go in `src/compiler/errors/codes/`.
- The AI docs (`llms.txt` and markdown pages) are built by the `docs` repo from `reference/api.ts` and served at https://lusia.azpepoze.com/llms.txt.

## Set up

1. Install packages:

   ```sh
   bun install
   ```

   This also installs Prettier for the tests. Prettier is an optional peer for apps: only `lusia format` needs it.

2. Check your change:

   | Command              | What it does                                                                                                     |
   | -------------------- | ---------------------------------------------------------------------------------------------------------------- |
   | `bun run check`      | Typecheck and tests, with timings by area. Uses every CPU at low priority; set `LUSIA_TEST_PARALLEL=4` to cap it |
   | `bun run format`     | Format all files                                                                                                 |
   | `bun run dev:stress` | Run the stress example on port 3000                                                                              |

> [!TIP]
> Set `LUSIA_CHROMIUM` to a Chromium path to run the browser tests. Without it they are skipped.

## VS Code support

`@lusiajs/vscode-support` is a separate package in `packages/vscode-support`. It holds the built logic that editors load: completion, hover, lint and format.

| Entry                            | File             | Used by               |
| -------------------------------- | ---------------- | --------------------- |
| `@lusiajs/vscode-support/vscode` | `dist/vscode.js` | The VS Code extension |

- Source: `src/integrations/vscode-support/host.ts`. Build: `bun scripts/build-vscode-support.ts` (the host test runs it once, so `bun run check` covers it).
- Types: `dist/vscode.d.ts` is one bundled file with no `#` imports, so consumers do not need `skipLibCheck`. A test type-checks a consumer project against it. The types use browser types (Element, Event), so a consumer needs `"lib": ["ESNext", "DOM"]` in its tsconfig, as VS Code extensions already have.
- The version always matches `lusiajs`. A test checks it.
- Release: the publish workflow builds and publishes it right after `lusiajs`, with the same version.
- Bump `EDITOR_API_VERSION` in `src/integrations/vscode-support/host.ts` when a namespace changes in a breaking way.
- Namespaces (the contract, checked by `test/integrations/vscode-support/host.test.ts`): `range`, `completions`, `completionData`, `markupItems`, `hover`, `markdown`, `apiLookup`, `autoImport`, `errorPosition`, `semanticTokens`, `scriptSymbols`, `format`, `formatExpressions`, `indentSetting`, `prettierParts`, `lint`, `parseImports`, `parseProps`, `parseRegions`, `parseSections`, `parseTag`, `compiler`, `api`, `runtime`.
- `semanticTokens.semanticTokens(source)` returns tokens for markup. Editors build their legend from `semanticTokens.TOKEN_TYPES` and `semanticTokens.TOKEN_MODIFIERS`.

## Prettier plugin

`@lusiajs/prettier-plugin` is in `packages/prettier-plugin`. It formats `.lusia` files with the same formatter as `lusia format`.

- Source: `src/integrations/prettier-plugin/`. Build: `bun scripts/build-prettier-plugin.ts`, which writes `packages/prettier-plugin/dist/index.js`.
- The end-to-end test builds the plugin itself.
- The version always matches `lusiajs`. A test checks it.
- Release: the publish workflow builds and publishes it right after `@lusiajs/vscode-support`, with the same version.
- Users read [the plugin README](packages/prettier-plugin/README.md).

## Open a pull request

1. Branch from `dev`.
2. Keep one logical change per pull request.
3. Use [Conventional Commits](https://www.conventionalcommits.org) for commit messages, such as `fix(variable): ...`.
4. Run `bun run check`. CI runs it too.
5. Open the pull request into `dev`. Say what changed and how you checked it.

## Release notes

See the [GitHub releases](https://github.com/lusiajs/lusia/releases).
