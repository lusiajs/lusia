<p align="center"><img src="https://raw.githubusercontent.com/lusiajs/lusia/main/logo/logo-128.png" width="96" alt="Lusia logo"></p>

# Lusia

A UI framework for [Bun](https://bun.sh). Write each component in one `.lusia` file. The page updates when your variables change.

> [!IMPORTANT]
> Lusia is in beta. APIs and markup may change.

## Install

Needs [Bun](https://bun.sh) 1.4 or newer.

| Goal | Command |
| ---- | ------- |
| New app | `bun create lusiajs my-app` |
| Add to a project | `bun add lusiajs` |

> [!NOTE]
> `lusia format` needs Prettier. Add it with `bun add -d prettier`.

## Example

```html
<script>
  import { variable } from "lusiajs";
  const count = variable(0);
</script>
<button onclick={() => count.value++}>Clicked {count.value} times</button>
```

## More

| Topic | Link |
| ----- | ---- |
| Docs site | https://lusia.azpepoze.com |
| AI docs for assistants | https://lusia.azpepoze.com/llms.txt |
| Report a bug or ask a question | https://github.com/lusiajs/lusia/issues |
| Contribute | [CONTRIBUTING.md](CONTRIBUTING.md) |
