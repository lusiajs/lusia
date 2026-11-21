import packageJson from "../../package.json" with { type: "json" };
import configSchema from "../../config.schema.json" with { type: "json" };
import { api } from "../../reference/api.ts";
import { CODES } from "../../src/compiler/errors/codes.ts";
import { buildApiPage } from "./api-page.ts";
import { buildConfigPage } from "./config-page.ts";
import { buildErrorsPage } from "./errors-page.ts";
import { buildIndexPage } from "./index-page.ts";
import { buildLlmsFullTxt, buildLlmsTxt } from "./llms.ts";
import type { DocFiles } from "./links.ts";

const INTRO_SUFFIX =
  " These pages are generated from the API reference, the error codes and the config schema.";

function addFile(files: DocFiles, path: string, content: string): void {
  if (files.has(path)) throw new Error(`Two docs pages write ${path}`);
  files.set(path, content);
}

// Every file the package ships, keyed by its path from the package root.
export function buildDocFiles(): DocFiles {
  const files: DocFiles = new Map();
  const description = packageJson.description;
  addFile(files, "docs/README.md", buildIndexPage(api, description + INTRO_SUFFIX));
  for (const entry of api) {
    addFile(files, `docs/api/${entry.id}.md`, buildApiPage(entry, api));
  }
  addFile(files, "docs/errors.md", buildErrorsPage(CODES));
  addFile(files, "docs/config.md", buildConfigPage(configSchema));
  addFile(files, "llms.txt", buildLlmsTxt(api, description));
  addFile(files, "llms-full.txt", buildLlmsFullTxt(files));
  return files;
}
