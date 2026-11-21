# Contributing to Lusia

Thanks for helping. Read the rules, set up, then open a pull request.

## Repo layout

| Path | What it holds |
| ---- | ------------- |
| `src/runtime` | The `lusiajs` package: variables, DOM helpers, animate |
| `src/compiler` | Turns `.lusia` files into TypeScript modules |
| `src/language` | Parse, format and lint for `.lusia` files |
| `src/editor` | Completion, hover and error logic for editors |
| `src/bun-plugin` | The Bun loader for `.lusia` files |
| `src/cli` | The `lusia` command |
| `test/` | Tests. One folder per area, mirroring `src/` |
| `examples/stress` | Scenarios that push the limits |
| `reference/api.ts` | The API table, read by the extension and the docs site |
| `scripts/` | `check.ts` for `bun run check`, `generate-docs.ts` for the package docs |

## Other repos

| Repo | Uses `lusiajs` for |
| ---- | ------------------ |
| [lusiajs/create](https://github.com/lusiajs/create) | The starter app |
| [lusiajs/vsix](https://github.com/lusiajs/vsix) | The VS Code extension |
| [lusiajs/docs](https://github.com/lusiajs/docs) | The docs site |

## Rules

- Framework logic goes in domain folders: `parse/`, `style/`, `template/`, `variable/`, `dom/`.
- Keep one job per file, around 150 lines.
- Put a helper in `utils/` only when two or more domains use it.
- Imports across areas use the `#runtime/`, `#compiler/`, `#bun-plugin/`, `#cli/` and `#language/` aliases. `src/runtime` ships to apps, so it uses relative imports only.
- A change to the API or to `.lusia` markup updates `reference/api.ts` and `examples/stress` in the same change.
- Then update `lusiajs/docs` (Guide, demos, Prism language) and `lusiajs/vsix` (grammar, completion, hover, lint, formatter).
- New error codes go in `src/compiler/errors/codes/`.
- Never edit the generated files in `docs/`. Change the sources.

## Set up

1. Install packages:

   ```sh
   bun install
   ```

2. Check your change:

   | Command | What it does |
   | ------- | ------------ |
   | `bun run check` | Typecheck and tests |
   | `bun run format` | Format all files |
   | `bun run dev:stress` | Run the stress example on port 3000 |

> [!TIP]
> Set `LUSIA_CHROMIUM` to a Chromium path to run the browser tests. Without it they are skipped.

## Open a pull request

1. Branch from `dev`.
2. Keep one logical change per pull request.
3. Use [Conventional Commits](https://www.conventionalcommits.org) for commit messages, such as `fix(variable): ...`.
4. Run `bun run check`. CI runs it too.
5. Open the pull request into `dev`. Say what changed and how you checked it.

## Release notes

See the [GitHub releases](https://github.com/lusiajs/lusia/releases).
