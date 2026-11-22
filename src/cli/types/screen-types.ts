import type { Screens } from "#runtime/screen/screens.ts";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const FOLDER = ".lusia";
const FILE = "screens.d.ts";

export function screenTypesSource(screens: Screens | undefined): string {
  const members = Object.keys(screens ?? {})
    .map((name) => `    ${name}: true;\n`)
    .join("");
  return `export {};\n\ndeclare module "lusiajs" {\n  interface ProjectScreens {\n${members}  }\n}\n`;
}

async function readCurrent(file: string): Promise<string | undefined> {
  try {
    return await readFile(file, "utf8");
  } catch {
    return undefined;
  }
}

/** Writes .lusia/screens.d.ts in the app folder. Skips the write when the content is the same. */
export async function writeScreenTypes(root: string, screens: Screens | undefined): Promise<void> {
  const folder = join(root, FOLDER);
  const file = join(folder, FILE);
  const source = screenTypesSource(screens);
  if ((await readCurrent(file)) === source) return;
  await mkdir(folder, { recursive: true });
  await writeFile(file, source);
}
