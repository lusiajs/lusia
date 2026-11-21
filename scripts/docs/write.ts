import { mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { DocFiles } from "./links.ts";

// Removes the old docs folder first, so a page for a deleted entry does not stay behind.
export async function writeDocFiles(outputDir: string, files: DocFiles): Promise<void> {
  await rm(join(outputDir, "docs"), { recursive: true, force: true });
  for (const [path, content] of files) {
    const target = join(outputDir, path);
    await mkdir(dirname(target), { recursive: true });
    await Bun.write(target, content);
  }
}
