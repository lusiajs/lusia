import { existsSync } from "node:fs";
import { cp } from "node:fs/promises";
import { join, resolve, sep } from "node:path";

const PUBLIC_FOLDER = "public";

function publicPath(dir: string): string {
  return join(dir, PUBLIC_FOLDER);
}

export async function copyPublic(dir: string, outdir: string): Promise<void> {
  const source = publicPath(dir);
  if (existsSync(source)) await cp(source, outdir, { recursive: true });
}

/** The file under `public/` for a URL path, or null when it is missing or outside the folder. */
export function publicFile(dir: string, pathname: string): Bun.BunFile | null {
  const root = resolve(publicPath(dir));
  const file = resolve(root, `.${decodeURIComponent(pathname)}`);
  if (!file.startsWith(`${root}${sep}`)) return null;
  return Bun.file(file);
}
