# Prettier plugin for Lusia

[Prettier](https://prettier.io) formats `.lusia` files with this plugin. The plugin uses the same formatter as `lusia format`.

Back to the [Lusia README](../../README.md).

## Install

| Step | Command |
| ---- | ------- |
| Add Prettier | `bun add -d prettier` |
| Add the plugin | `bun add -d @lusiajs/prettier-plugin` |

## Config

Add the plugin to `.prettierrc`:

```json
{
  "plugins": ["@lusiajs/prettier-plugin"]
}
```

Then run Prettier on your files:

```sh
bunx prettier --write "src/**/*.lusia"
```

## Options

| Option | Default | Effect |
| ------ | ------- | ------ |
| `lusiaIndentScriptAndStyle` | `true` | Indent the code inside `<script>` and `<style>` by one level. Set `false` to keep it flush-left. |

```json
{
  "plugins": ["@lusiajs/prettier-plugin"],
  "lusiaIndentScriptAndStyle": false
}
```

Other Prettier options, such as `printWidth`, `tabWidth`, `useTabs`, `semi`, `singleQuote`, `trailingComma` and `bracketSpacing`, also apply to the code inside a `.lusia` file.

> [!NOTE]
> `bun fmt` does not load custom Prettier plugins yet (Bun 1.4.5). Use `prettier` to format `.lusia` files.
