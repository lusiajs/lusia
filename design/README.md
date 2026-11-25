# Design playgrounds

Framework design playgrounds, one per feature. They run on the local source.

## Run one

```sh
bun run design <name>         # dev server
bun run design:build <name>   # build into design/<name>/dist
```

No name lists them.

## Playgrounds

| Name                      | Shows                                                               | Status             |
| ------------------------- | ------------------------------------------------------------------- | ------------------ |
| [basics](basics/)         | `{expr}`, `<script>`                                                | Runs               |
| [reactivity](reactivity/) | `variable`, `compute`, `autoRun`, `watch`, `onUpdate`               | Runs               |
| [flow](flow/)             | `<IF>`, `<ELSEIF>`, `<ELSE>`, `<EACH>`, `<FOR>`                     | Runs               |
| [events](events/)         | `on*`, `bind-*`, `listen`, `EVENT`, `keepRunning`                   | Runs               |
| [components](components/) | props, attach/detach, `<CONTENT />`, recursion, `<HTML>`, hooks     | Runs               |
| [lazy](lazy/)             | lazy children, `<FALLBACK>`, `<NO_LAZY />`, `lazy` config           | Runs               |
| [styling](styling/)       | style modes, `:global`, `SCREEN`, `screens`                         | Runs               |
| [motion](motion/)         | `animate`, layout, presets, `EASE`, controller, `setConfig`         | Runs               |
| [routes](routes/)         | `routes` map, layout with `<CONTENT />`, `<head>`, `PATH`, `PARAMS` | Runs               |
| [ssr](ssr/)               | build-time SSR, `<NO_SSR />`, `ssr: false`                          | Design (issue #95) |

"Design": not built yet. The app is the target. (none right now)

## Layout of one playground

```
design/<name>/
├── index.html        page shell, loads src/main.ts
├── lusia.config.ts   the config for this app
└── src/
    ├── main.ts       attaches App
    ├── App.lusia     one section per feature
    └── *.lusia       one component per feature
```

New idea: copy a folder.
