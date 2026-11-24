const VERSION_LINE = /^  "version": "[^"]*"/m;

// Replaces only the top-level version value, so the rest of the file keeps its exact text.
export function setPackageVersionText(text: string, version: string): string {
  if (!VERSION_LINE.test(text)) {
    throw new Error('no top-level "version" field with 2-space indent');
  }
  return text.replace(VERSION_LINE, `  "version": "${version}"`);
}
