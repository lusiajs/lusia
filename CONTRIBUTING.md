# Contributing to Lusia

Welcome, and thank you for helping improve Lusia. Start with the [quick start](README.md#quick-start), then use this page for commands and code rules. The [Guide](https://lusia.azpepoze.com/guide) explains the framework itself.

## Commands

| Task | Command |
| ---- | ------- |
| Install packages | `bun install` |
| Run the stress example (port 3000) | `bun run dev:stress` |
| Run the tests | `bun run test` |
| Run one test file | `bun test test/compiler/style/modes.test.ts` |
| Run tests by name | `bun test -t "diamond"` |
| Typecheck | `bun run typecheck` |
| Format all files | `bun run format` |
| Check formatting without writing | `bun run format:check` |
| Check before a commit | `bun run check` |
| Pack what npm would ship | `bun pm pack --dry-run` |

> [!TIP]
> Set `LUSIA_CHROMIUM` to a Chromium path to run the browser tests. Without it they are skipped.

`bun run check` runs the typecheck and the tests in parallel.

Tests use small data. The large stress sizes live in `examples/stress` and run only on the stress page.

Run the `lusia` command from source with `bun src/cli/index.ts <command>`. Run `bun src/cli/index.ts --help` for the commands and flags.

## Repo layout

| Path | What it holds |
| ---- | ------------- |
| `src/runtime` | The `lusiajs` package: variables, DOM helpers, animate |
| `src/compiler` | Turns `.lusia` files into TypeScript modules |
| `src/language` | Parse, format and lint for `.lusia` files |
| `src/editor` | Completion, hover and error logic shared by editors. Tests in `test/editor` |
| `src/bun-plugin` | The Bun loader for `.lusia` files and `?raw` imports |
| `src/cli` | The `lusia` command |
| `test/` | Tests. One folder per area, mirroring `src/`. `test/setup.ts` sets up the fake DOM |
| `examples/stress` | Scenarios that push the limits and report timings |
| `reference/api.ts` | The API table. The extension and the docs site read it as `lusiajs/api` |
| `scripts/check.ts` | The steps behind `bun run check` |

## Other repos

| Repo | Depends on `lusiajs` through |
| ---- | ---------------------------------- |
| [lusiajs/create](https://github.com/lusiajs/create) | The starter app uses the `lusiajs` package |
| [lusiajs/vsix](https://github.com/lusiajs/vsix) | `lusiajs/api`, `lusiajs/language/*`, `lusiajs/editor/*`, `lusiajs/compiler` |
| [lusiajs/docs](https://github.com/lusiajs/docs) | `lusiajs/api`, `lusiajs/language/*`, `lusiajs/editor/*`, `lusiajs/errors/*`, `lusiajs/compiler/*` |

To try a local change in another repo, run `bun link` here, then `bun link lusiajs` there.

## Code rules

- Framework logic lives in domain folders: `parse/`, `style/`, `template/`, `variable/` and `dom/`.
- `utils/` holds only helpers that two or more domains use. One job per file, around 150 lines.
- Imports across areas use the `#runtime/`, `#compiler/`, `#bun-plugin/`, `#cli/` and `#language/` aliases. They are defined in `imports` in `package.json`, so Bun and TypeScript both resolve them, also for apps that install `lusiajs`. Imports inside one area stay relative. `src/runtime` ships to apps, so it uses relative imports only.

## Error codes

| Range | Meaning |
| ----- | ------- |
| `L1xxx` | Compile errors in `.lusia` files |
| `L2xxx` | Runtime errors |
| `L3xxx` | Bundler errors from `Bun.build` |

To add a code, add one entry to `CODES` in `src/compiler/errors/codes.ts`.

## Syntax and API changes

A change to the API or to `.lusia` markup must update `reference/api.ts` and `examples/stress` (when it is affected) in the same change. Then follow it up in the other repos:

| Repo | Update |
| ---- | ------ |
| `lusiajs/docs` | The Guide, the demos and the Prism `lusia` language |
| `lusiajs/vsix` | The grammar, completion, hover, lint and formatter |

Release `lusiajs` first, then bump it in `docs` and `vsix`.

## Releases

1. Update `version` in `package.json`.
2. Run `bun run check`.
3. Push a tag that matches the version, such as `v0.1.0-beta.1`. The `publish.yml` workflow publishes to npm with `bun publish`.

CI runs `bun run check` on every push and pull request to `dev` and `main`.

A version with a dash (`0.1.0-beta.1`) is published under the `beta` tag. A plain version (`0.1.0`) is published as `latest`.

## Workflow

- Commit messages use [Conventional Commits](https://www.conventionalcommits.org): `type(scope): short imperative summary`. Keep the summary lowercase, with no trailing period, under about 72 characters.
- Run `bun run check` before you report a change as done.
