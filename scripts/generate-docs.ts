import { fileURLToPath } from "node:url";
import { generateDocs } from "./docs/generate.ts";

const ROOT = fileURLToPath(new URL("../", import.meta.url));

try {
  const written = await generateDocs(ROOT);
  console.log(`Wrote ${written.length} doc files to ${ROOT}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
