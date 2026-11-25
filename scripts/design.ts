import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const DESIGN = join(ROOT, "design");
const MODES = new Set(["dev", "build"]);

function playgrounds(): string[] {
  return readdirSync(DESIGN, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(DESIGN, entry.name, "index.html")))
    .map((entry) => entry.name)
    .sort();
}

const [mode = "", name = ""] = Bun.argv.slice(2);
const names = playgrounds();
if (!MODES.has(mode) || !names.includes(name)) {
  console.error(`usage: bun run design <name>  |  bun run design:build <name>`);
  console.error(`playgrounds: ${names.join(", ")}`);
  process.exit(1);
}

const cli = Bun.spawn(["bun", join(ROOT, "src/cli/index.ts"), mode, join(DESIGN, name)], {
  stdio: ["inherit", "inherit", "inherit"],
});
process.exit(await cli.exited);
