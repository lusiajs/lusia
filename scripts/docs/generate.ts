import { buildDocFiles } from "./build.ts";
import { findBrokenLinks } from "./links.ts";
import { writeDocFiles } from "./write.ts";

// Builds the docs, refuses to write them when a link is broken, and returns the written paths.
export async function generateDocs(outputDir: string): Promise<string[]> {
  const files = buildDocFiles();
  const brokenLinks = findBrokenLinks(files);
  if (brokenLinks.length > 0) {
    throw new Error(`Generated docs have broken links:\n${brokenLinks.join("\n")}`);
  }
  await writeDocFiles(outputDir, files);
  return [...files.keys()];
}
